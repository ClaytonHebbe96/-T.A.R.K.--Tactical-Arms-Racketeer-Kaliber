import { DependencyContainer } from "tsyringe";

// SPT Types
import { IPreSptLoadMod } from "@spt/models/external/IPreSptLoadMod";
import { IPostDBLoadMod } from "@spt/models/external/IPostDBLoadMod";
import { ILogger } from "@spt/models/spt/utils/ILogger";
import { PreSptModLoader } from "@spt/loaders/PreSptModLoader";
import { DatabaseServer } from "@spt/servers/DatabaseServer";
import { ImageRouter } from "@spt/routers/ImageRouter";
import { ConfigServer } from "@spt/servers/ConfigServer";
import { ConfigTypes } from "@spt/models/enums/ConfigTypes";
import { ITraderConfig } from "@spt/models/spt/config/ITraderConfig";
import { IRagfairConfig } from "@spt/models/spt/config/IRagfairConfig";
import { JsonUtil } from "@spt/utils/JsonUtil";

// Import Trader Settings
import * as baseJson from "../db/base.json";

import { TraderHelper } from "./traderHelpers";
import { FluentAssortConstructor as FluentAssortCreator } from "./fluentTraderAssortCreator";
import { Money } from "@spt/models/enums/Money";
import { Traders } from "@spt/models/enums/Traders";
import { HashUtil } from "@spt/utils/HashUtil";
import { ItemTpl } from "@spt/models/enums/ItemTpl";

class Tark implements IPreSptLoadMod, IPostDBLoadMod 
{
    private mod: string;
    private logger: ILogger;
    private traderHelper: TraderHelper;
    private fluentAssortCreator: FluentAssortCreator;

    private traderBase;
    private traderNickname: string;

    constructor() 
    {
        this.mod = "idiotturdle-kaliber"; // Set name of mod so we can log it to console later
        this.traderNickname = "Kaliber"
    }

    /**
     * Some work needs to be done prior to SPT code being loaded, registering the profile image + setting trader update time inside the trader config json
     * @param container Dependency Container
     */
    public preSptLoad(container: DependencyContainer): void 
    {
        // Get a logger
        this.logger = container.resolve<ILogger>("WinstonLogger");
        this.logger.debug(`[${this.mod}] preSpt Loading...`);

        // Get SPT code/data we need later
        const preSptModLoader: PreSptModLoader = container.resolve<PreSptModLoader>("PreSptModLoader");
        const imageRouter: ImageRouter = container.resolve<ImageRouter>("ImageRouter");
        const hashUtil: HashUtil = container.resolve<HashUtil>("HashUtil");
        const configServer = container.resolve<ConfigServer>("ConfigServer");
        const traderConfig: ITraderConfig = configServer.getConfig<ITraderConfig>(ConfigTypes.TRADER);
        const ragfairConfig = configServer.getConfig<IRagfairConfig>(ConfigTypes.RAGFAIR);

        // Create helper class and use it to register our traders image/icon + set its stock refresh time
        this.traderHelper = new TraderHelper();
        this.fluentAssortCreator = new FluentAssortCreator(hashUtil, this.logger);
        this.traderHelper.registerProfileImage(baseJson, this.mod, preSptModLoader, imageRouter, "Kaliber.jpg");
        this.traderHelper.setTraderUpdateTime(traderConfig, baseJson, 3600, 4000);

        // Add trader to trader enum
        Traders[baseJson._id] = baseJson._id;

        // Add trader to flea market
        ragfairConfig.traders[baseJson._id] = true;

        this.logger.debug(`[${this.mod}] preSpt Loaded`);
    }

    /**
     * Majority of trader-related work occurs after the aki database has been loaded but prior to SPT code being run
     * @param container Dependency container
     */
    public postDBLoad(container: DependencyContainer): void 
    {
        this.logger.debug(`[${this.mod}] postDb Loading ...`);

        // Resolve SPT classes we'll use
        const databaseServer: DatabaseServer = container.resolve<DatabaseServer>("DatabaseServer");
        const jsonUtil: JsonUtil = container.resolve<JsonUtil>("JsonUtil");

        // Get a reference to the database tables
        const tables = databaseServer.getTables();

        // Add new trader to the trader dictionary in DatabaseServer - has no assorts (items) yet
        this.traderHelper.addTraderToDb(baseJson, tables, jsonUtil);

        // Add all ammos to trader assort

        // Add all grenades to trader assort

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
            this.traderNickname,
            baseJson.nickname,
            baseJson.location,
            `This is ${this.traderNickname}'s shop`);

        this.logger.debug(`[${this.mod}] postDb Loaded`);

    }
}

export const mod = new Tark();
