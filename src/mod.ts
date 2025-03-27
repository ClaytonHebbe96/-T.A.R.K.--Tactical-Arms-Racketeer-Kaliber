import { DependencyContainer } from "tsyringe";

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
        const hashUtil: HashUtil = container.resolve<HashUtil>("HashUtil");
        const configServer = container.resolve<ConfigServer>("ConfigServer");
        const traderConfig: ITraderConfig = configServer.getConfig<ITraderConfig>(ConfigTypes.TRADER);
        const ragfairConfig = configServer.getConfig<IRagfairConfig>(ConfigTypes.RAGFAIR);

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
            if (Tark.config.debugLogging) logger.log(`[${this.mod}] Trader added to Flea Market.`, "green");
            ragfairConfig.traders[baseJson._id] = true;
        }
        else
        {
            if (Tark.config.debugLogging) logger.log(`[${this.mod}] Trader removed from Flea Market.`, "red");
            ragfairConfig.traders[baseJson._id] = false;
        }

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
        const logger = container.resolve<ILogger>("WinstonLogger");
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
        // Blacklist consists of obscure shrapnel items that the trader doesn't need to sell as they are not usable.
        const blacklistedItems = [
            "5943d9c186f7745a13413ac9",
            "67654a6759116d347b0bfb86",
            "5996f6cb86f774678763a6ca",
            "5996f6fc86f7745e585b4de3",
            "66ec2aa6daf127599c0c31f1",
            "63b35f281745dd52341e5da7",
            "5996f6d686f77467977ba6cc"
        ]
        const ammo = items.filter(x => itemHelper.isOfBaseclass(x._id, BaseClasses.AMMO));
        const grenades = items.filter(x => itemHelper.isOfBaseclass(x._id, BaseClasses.THROW_WEAPON));
        const ammoAndGrenades = [...ammo, ...grenades];
        const ammoAndGrenadeIds = [];
        for (const ammoOrGrenade of ammoAndGrenades)
        {
            if (ammoOrGrenade._id)
            {
                ammoAndGrenadeIds.push(ammoOrGrenade._id);
            }
        }

        for (const itemID of ammoAndGrenadeIds)
        {
            if (blacklistedItems.includes(itemID))
            {
                if (Tark.config.debugLogging) logger.log(`[${this.mod}] ItemID: ${itemID} is blacklisted`, "red");
                continue;
            }
            let price = (priceTable[itemID] * Tark.config.itemPriceMultiplier);
            if (!price)
            {
                price = (handbookTable.Items.find(x => x.Id === itemID)?.Price ?? 1) * Tark.config.itemPriceMultiplier;
            }
            this.fluentAssortCreator.createSingleAssortItem(itemID)
                .addUnlimitedStackCount()
                .addMoneyCost(Money.ROUBLES, Math.round(price))
                .addLoyaltyLevel(1)
                .export(tables.traders[baseJson._id])
            if (Tark.config.debugLogging) logger.log("ItemID: " + itemID + " for price: " + Math.round(price), "cyan");
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
