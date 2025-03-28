# **TARK - Tactical Arms Racketeer: Kaliber** by IdiotTurdle

## Backstory
### **Kaliber - _The Tactical Arms Racketeer_:**

Born in the war-torn Balkans, Mikhail "Kaliber" Kozlov grew up surrounded by conflict. As a teenager, he learned the value of firepower—not just in battle, but in business. Smuggling ammunition and repairing abandoned weapons, he built a reputation as someone who could find, fix, and flip anything that shot, exploded, or killed.

By his mid-20s, he had contacts in ex-Soviet military stockpiles, European black markets, and Middle Eastern war zones. Governments, rebels, and mercenaries alike knew that if they needed specialized gear—armor-piercing rounds, experimental scopes, vintage suppressors—Kaliber was the man to call. His network stretched from back-alley arms fairs in Serbia to elite private security firms in Paris.

Despite his ruthless efficiency, Kaliber is not just a thug with bullets—he’s a businessman. He deals in weapons, not wars, and only moves product when the price is right. But if you cross him? Well, let’s just say he never sells anything he hasn’t tested himself.

## Mod Details
This mod adds a trader who sells all ammunition types and grenades found in the region of Tarkov.

**Disclaimer**: This mod is provided ***as-is*** with ***no guarantee*** of support.

## Getting Started
This section explains how to  install and use this mod.

### Prerequisites
EFT and SPT v3.11 are required to use this mod.

### Installation:
**For the purpose of these directions, `'[SPT]'` represents your SPT folder path.**

Start by downloading the mod from the [Releases]("") page.

Follow these steps to install and configure the mod.

1. Extract the contents of the zip file into the root of your `'[SPT]'` folder.

    - Same location as `'SPT.Server.exe'` and `'SPT.Launcher.exe'`

2. Edit the config to adjust the values to your liking.

    - Config options are detailed in the next section.

3. Start `'SPT.Server.exe'` and wait until it shows ***"Server is running"***.

4. Start `'SPT.Launcher.exe'`

5. Open the trader screen to see Kaliber waiting with plenty of ammo to sell.

## Configuration
This section will describe the options for trader customization in `'./config.json'`

1. **itemPriceMultiplier:**

    - Number each items price is multiplied by. 0 being free, and 1 being base game price. **Default: 1** <br>

2. **traderRefreshMin:**

    - Minimum time in seconds for the traders stock to refresh. **Default: 1800 (30 minutes)**
    - Must be less than traderRefreshMax.

3. **traderRefreshMax:**

    - Must be greater than traderRefreshMin.
    - Maximum time in seconds for the traders stock to refresh. **Default: 3600 (60 minutes)**

4. **addTraderToFlea:**

    - Whether or not trader offers will be listed on the Flea Market. **Default: true**

5. **debugLogging:**

    - Whether or not logging is enabled for key load points on server start. **Default: false**

## Road map
- [x] Publish for SPT v3.11
- [ ] Fix potential issues found/reported in initial release.
- [ ] Add a few of my favorite weapon setups to the trader assort.

## Contribution
If you have a suggestion that would make this better, please fork the repo and create a pull request. You can also simply open an issue with the tag **"enhancement"**.

1. Fork the project

2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)

3. Commit your changes (`git commit -m "Add some amazing feature"`)

4. Push to the branch (`git push origin feature/AmazingFeature`)

5. Open a pull request with tag **"enhancement"**

## License
Distributed under the MIT License. See `License.txt` for more information.

## Acknowledgments
Addition Contributors:

1. [Saryn]("https://hub.sp-tarkov.com/user/76044-saryn/")
    - Used her own free time to help make the amazing AI SLOP that is Kaliber's trader avatar.
2. [AcidPhantasm]("https://hub.sp-tarkov.com/user/51352-acidphantasm/")
    - Lot of time spent understanding how traders and their logic works using his trader [HarryHideout]("https://hub.sp-tarkov.com/files/file/1817-harryhideout/").
3. [Chomp]("https://hub.sp-tarkov.com/user/4571-chomp/?highlight=Chomp")
    - Creating the [Mod-Examples]("https://github.com/sp-tarkov/mod-examples/tree/master") repo for help with understanding the server side of SPT modding.
    
<br>

***And of course none of would be able to do any of this without the dev team as a whole. They are a super helpful and inspirational team of people.***