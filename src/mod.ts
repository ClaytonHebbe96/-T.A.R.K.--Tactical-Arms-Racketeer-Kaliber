import { container, DependencyContainer } from "tsyringe";

// SPT Types
import { IPreSptLoadMod } from "@spt/models/external/IPreSptLoadMod";
import { IPostDBLoadMod } from "@spt/models/external/IPostDBLoadMod";
import { ILogger } from "@spt/models/spt/utils/ILogger";
import { PreSptModLoader } from "@spt/loaders/PreSptModLoader";
import { DatabaseService } from "@spt/services/DatabaseService";
import { ImageRouter } from "@spt/routers/ImageRouter";
import { ConfigServer } from "@spt/servers/ConfigServer";
import { ConfigTypes } from "@spt/models/enums/ConfigTypes";
import { ITraderConfig } from "@spt/models/spt/config/ITraderConfig";
import { IRagfairConfig } from "@spt/models/spt/config/IRagfairConfig";
import { DynamicRouterModService } from "@spt/services/mod/dynamicRouter/DynamicRouterModService";
import { RandomUtil } from "@spt/utils/RandomUtil";
import { JsonUtil } from "@spt/utils/JsonUtil";
import * as fs from "node:fs";
import * as path from "node:path";

// Import Trader Settings
import * as baseJson from "../db/base.json";

import { TraderHelper } from "./traderHelpers";
import { FluentAssortConstructor as FluentAssortCreator } from "./fluentTraderAssortCreator";
import { Money } from "@spt/models/enums/Money";
import { Traders } from "@spt/models/enums/Traders";
import { HashUtil } from "@spt/utils/HashUtil";
import { RagfairOfferGenerator } from "@spt/generators/RagfairOfferGenerator";
import { ItemHelper } from "@spt/helpers/ItemHelper";
import { BaseClasses } from "@spt/models/enums/BaseClasses";

class Tark implements IPreSptLoadMod, IPostDBLoadMod 
{
    private mod: string;
    private logger: ILogger;
    private traderHelper: TraderHelper;
    private fluentAssortCreator: FluentAssortCreator;
    private static config: Config;
    private static configPath = path.resolve(__dirname, "../config/config.json");

    constructor() 
    {
        this.mod = "idiotturdle-kaliber"; // Set name of mod so we can log it to console later
    }

    /**
     * Some work needs to be done prior to SPT code being loaded, registering the profile image + setting trader update time inside the trader config json
     * @param container Dependency Container
     */
    public preSptLoad(container: DependencyContainer): void 
    {
        // Get SPT code/data we need later
        const logger = container.resolve<ILogger>("WinstonLogger");
        const preSptModLoader: PreSptModLoader = container.resolve<PreSptModLoader>("PreSptModLoader");
        const imageRouter: ImageRouter = container.resolve<ImageRouter>("ImageRouter");
        const databaseService: DatabaseService = container.resolve<DatabaseService>("DatabaseService");
        const hashUtil: HashUtil = container.resolve<HashUtil>("HashUtil");
        const configServer = container.resolve<ConfigServer>("ConfigServer");
        const traderConfig: ITraderConfig = configServer.getConfig<ITraderConfig>(ConfigTypes.TRADER);
        const ragfairConfig = configServer.getConfig<IRagfairConfig>(ConfigTypes.RAGFAIR);
        const dynamicRouterModService = container.resolve<DynamicRouterModService>("DynamicRouterModService");
        const ragfairOfferGenerator = container.resolve<RagfairOfferGenerator>("RagfairOfferGenerator");

        // Load config file before accessing it
        Tark.config = JSON.parse(fs.readFileSync(Tark.configPath, "utf-8"));
        if (Tark.config.debugLogging) logger.log(`[${this.mod}] preSpt Loading...`, "yellow");

        // Set config values to local variables for validation and use
        let minRefresh = Tark.config.traderRefreshMin;
        let maxRefresh = Tark.config.traderRefreshMax;
        const addToFlea = Tark.config.addTraderToFlea;
        if (minRefresh >= maxRefresh)
        {
            minRefresh = 1800;
            maxRefresh = 3600;
            logger.error(`[${this.mod}] [CONFIG] traderRefreshMin must be less than traderRefreshMax. Refresh timers have been reset to default`);
        }
        if (maxRefresh <= 2)
        {
            minRefresh = 1800;
            maxRefresh = 3600;
            logger.error(`[${this.mod}] [CONFIG] You set traderRefreshMax too low. Refresh timers have been reset to default.`);
        }

        // Create helper class and use it to register our traders image/icon + set its stock refresh time
        this.traderHelper = new TraderHelper();
        this.fluentAssortCreator = new FluentAssortCreator(hashUtil, this.logger);
        this.traderHelper.registerProfileImage(baseJson, this.mod, preSptModLoader, imageRouter, "Kaliber.jpg");
        this.traderHelper.setTraderUpdateTime(traderConfig, baseJson, minRefresh, maxRefresh);

        // Add trader to trader enum
        Traders[baseJson._id] = baseJson._id;

        // Add trader to flea market
        if (addToFlea)
        {
            ragfairConfig.traders[baseJson._id] = true;
        }
        else
        {
            ragfairConfig.traders[baseJson._id] = false;
        }

        dynamicRouterModService.registerDynamicRouter(
            "TarkRefreshStock",
            [
                {
                    url: "/client/items/prices/66eeef8b2a166b73d2066a7e",
                    action: async (url, info, sessionId, output) =>
                    {
                        const trader = databaseService.getTables().traders["66eeef8b2a166b73d2066a7e"];
                        const assortItems = trader.assort.items;

                        let updateFleaOffers = false;
                        if (Tark.config.randomizeBuyRestriction)
                        {
                            if (Tark.config.debugLogging) logger.info(`[${this.mod}] Refreshing Kaliber Stock with Randomized Buy Restrictions.`);

                            updateFleaOffers = true;
                            this.randomizeBuyRestriction(assortItems);
                        }
                        if (Tark.config.randomizeStockAvailable)
                        {
                            if (Tark.config.debugLogging) logger.info(`[${this.mod}] Refreshing Kaliber Stock with Randomized Stock Availability.`);

                            updateFleaOffers = true;
                            this.randomizeStockAvailable(assortItems);
                        }

                        if (updateFleaOffers) ragfairOfferGenerator.generateFleaOffersForTrader("66eeef8b2a166b73d2066a7e");

                        return output;
                    }
                }
            ],
            "spt"
        );

        if (Tark.config.debugLogging) logger.log(`[${this.mod}] preSpt Loaded`, "green");
    }

    /**
     * Majority of trader-related work occurs after the aki database has been loaded but prior to SPT code being run
     * @param container Dependency container
     */
    public postDBLoad(container: DependencyContainer): void 
    {
        Tark.config = JSON.parse(fs.readFileSync(Tark.configPath, "utf-8"));

        // Resolve SPT classes we'll use
        const logger = container.resolve<ILogger>("WintsonLogger");
        const databaseService: DatabaseService = container.resolve<DatabaseService>("DatabaseService");
        const jsonUtil: JsonUtil = container.resolve<JsonUtil>("JsonUtil");
        const priceTable = databaseService.getTables().templates.prices;
        const handbookTable = databaseService.getTables().templates.handbook;

        if (Tark.config.debugLogging) logger.log(`[${this.mod}] postDb Loading...`, "yellow");

        // Get a reference to the database tables
        const tables = databaseService.getTables();

        // Add new trader to the trader dictionary in DatabaseServer - has no assorts (items) yet
        this.traderHelper.addTraderToDb(baseJson, tables, jsonUtil);
        const start = performance.now();

        // Get ItemHelper ready to use
        const itemHelper: ItemHelper = container.resolve<ItemHelper>("ItemHelper");

        // Get all items in the database as an array so we can loop over them to find the ones that we want
        const items = Object.values(tables.templates.items)

        //  Get all items we want to sell (e.g. all ammos and all grenades)
        const assortItems = items.filter(x => itemHelper.isOfBaseclass(x._id, BaseClasses.AMMO || BaseClasses.THROW_WEAPON));

        // Iterate through newly created assortItems, set prices, and push to assort
        for (const itemID in assortItems)
        {
            let price = priceTable[itemID] * Tark.config.itemPriceMultiplier;
            if (!price)
            {
                price = (handbookTable.Items.find(x => x.Id === itemID)?.Price ?? 1) * Tark.config.itemPriceMultiplier;
            }
            this.fluentAssortCreator.createSingleAssortItem(itemID)
                .addUnlimitedStackCount()
                .addMoneyCost(Money.ROUBLES, Math.round(price))
                .addLoyaltyLevel(1)
                .export(tables.traders[baseJson._id])
        }

        //Add glock as a money purchase
        this.fluentAssortCreator
            .createComplexAssortItem(this.traderHelper.createGlock())
            .addUnlimitedStackCount()
            .addMoneyCost(Money.ROUBLES, 15000)
            .addBuyRestriction(10)
            .addLoyaltyLevel(1)
            .export(tables.traders[baseJson._id]);

        // Add trader to locale file, ensures trader text shows properly on screen
        // WARNING: adds the same text to ALL locales (e.g. chines/french/english)
        this.traderHelper.addTraderToLocales(
            baseJson,
            tables,
            baseJson.name,
            "Kaliber",
            baseJson.nickname,
            baseJson.location,
            "This is Kaliber's shop");
        
        const timeTaken = performance.now() - start;
        if (Tark.config.debugLogging) logger.log(`[${this.mod}] postDb Loaded: Assort generation took ${timeTaken.toFixed(3)}ms.`, "green");

    }
    private randomizeBuyRestriction(assortItemTable)
    {
        const randomUtil: RandomUtil = container.resolve<RandomUtil>("RandomUtil");
        // Randomize Assort Availability via config bool for server start
        for (const item in assortItemTable)
        {
            assortItemTable[item].upd.BuyRestrictionMax = 10;
            const itemID = assortItemTable[item]._id;
            const newRestricion = Math.round(randomUtil.randInt(1, 10));

            assortItemTable[item].upd.BuyRestriction = newRestricion;

            if (Tark.config.debugLogging) this.logger.log(`[${this.mod}] Item: [${itemID}] Buy Restriction Changed to: [${newRestricion}]`, "cyan");
        }
    }
    private randomizeStockAvailable(assortItemTable)
    {
        const randomUtil: RandomUtil = container.resolve<RandomUtil>("RandomUtil");
        for (const item in assortItemTable)
        {
            const itemID = assortItemTable[item]._id;
            assortItemTable[item].upd.UnlimitedCount = false;
            assortItemTable[item].upd.StackObjectsCount = 25;

            const outOfStockRoll = randomUtil.getChance100(Tark.config.outOfStockChance);

            if (outOfStockRoll)
            {
                assortItemTable[item].upd.StackObjectsCount = 0;

                if (Tark.config.debugLogging) this.logger.log(`[${this.mod}] Item: [${itemID}] Marked out of stock`, "cyan");
            }
            else
            {
                const newStock = randomUtil.randInt(1, 25);
                assortItemTable[item].upd.StackObjectsCount = newStock;

                if (Tark.config.debugLogging) this.logger.log(`[${this.mod}] Item: [${itemID}] Stock Count changed to: [${newStock}]`, "cyan");
            }
        }
    }
}

interface Config
{
    useBarters: boolean,
    useFleaPrices: boolean,
    itemPriceMultiplier: number,
    randomizeStockAvailable: boolean,
    outOfStockChance: number,
    randomizeBuyRestriction: boolean,
    traderRefreshMin: number,
    traderRefreshMax: number,
    addTraderToFlea: boolean,
    debugLogging: boolean
}

export const mod = new Tark();
