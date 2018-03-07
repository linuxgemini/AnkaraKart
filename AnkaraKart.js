const request = require("request-promise-native");
const iconv = require("iconv-lite");
const moment = require("moment-timezone");

/**
 * Initial class for AnkaraKart.
 * @author İlteriş Eroğlu
 */
class AnkaraKart {
    /**
     * Main constructor and provider.
     * @constructor
     */
    constructor() {
        if (process.version.slice(1).split(".")[0] < 8) throw new Error("Node 8.0.0 or higher is required. Update Node on your system.");
        try {
            /**
             * External config, created by DontRunMe.js
             * @type {Object}
             */
            var externalConfig = require("./DO-NOT-DELETE-ME.json");
        } catch (exp) {
            throw new Error("Critical config is not created. Please try running \"npm install --save AnkaraKart\".");
        }

        this.options = {
            maximumTimeFrame: 60000,
            primaryServer: "88.255.141.70",
            askedToPrimaryAt: 0,
            appGUID: externalConfig.appGUID,
            appVersion: externalConfig.appVersion,
            phoneModel: externalConfig.phoneModel,
            phoneOperatingSystemVersion: externalConfig.phoneOperatingSystemVersion
        };
    }

    /**
     * Connect to the endpoint and authorize.
     * @returns {Promise<true>}
     */
    authorize() {
        return new Promise(async(resolve, reject) => {
            try {
                var initalizer = await request(utils.generateConfig(this.options, this.options.primaryServer, "connect"));
                var initJSON = utils.cleanParse(initalizer);

                if (initJSON.data[0].status !== "TRUE") throw new Error("Status on API returning false (initalizer)");
                if (initJSON.data[0].servis !== "TRUE") throw new Error("Service on API returning false");
                if (initJSON.data[0].version !== this.options.appVersion) throw new Error(`API has returned version ${initJSON.data[0].version} but we have ${this.options.appVersion}\nReport to developer @linuxgemini ASAP.`);

                this.options.secondaryServer = (!initJSON.data[0].server ? this.options.primaryServer : initJSON.data[0].server);
                this.options.askedToPrimaryAt = Date.now();

                var base = await request(utils.generateConfig(this.options, this.options.secondaryServer, "start"));
                var baseJSON = utils.cleanParse(base);

                if (baseJSON.data[0].status !== "TRUE") throw new Error("Status on API returning false (base)");

                resolve(true);
                return;
            } catch (exp) {
                reject(exp);
                return;
            }
        });
    }

    /**
     * Checks if the authorization interval has passed.
     * @returns {boolean}
     */
    authorized() {
        return (Date.now() - this.options.askedToPrimaryAt < this.options.maximumTimeFrame);
    }

    /**
     * Automatically authorize if the authorization interval has passed.
     * @returns {Promise<true>}
     */
    autoAuthorize() {
        return new Promise(async(resolve, reject) => {
            if (!this.authorized()) {
                try {
                    await this.authorize();
                    resolve(true);
                    return;
                } catch (exp) {
                    reject(exp);
                    return;
                }
            } else {
                resolve(true);
                return;
            }
        });
    }

    /**
     * Get card information.
     * @param {string} cardNumber The card number, 16 digits long.
     * @param {boolean} canReturnRaw Return cardObjectRaw instead of cardObject.
     * @returns {Promise<Object>}
     */
    getCardInfo(cardNumber, canReturnRaw) {
        return new Promise(async(resolve, reject) => {
            try {
                if (typeof (cardNumber) !== "string") throw new Error("Card number must be a string.");
                if (parseInt(cardNumber).toString().length !== 16) throw new Error("Card number must be 16 digits long.");

                await this.autoAuthorize();

                var base = await request(utils.generateConfig(this.options, this.options.secondaryServer, "AnkaraKartBakiye", {
                    "KART": cardNumber
                }));
                var baseJSON = utils.cleanParse(base);

                if (baseJSON.data[0].status !== "TRUE") throw new Error("Status on API returning false (getCardInfo, baseJSON)");
                if (baseJSON.data[0].table[0].result === "3") throw new Error("Card is invalid.");

                if (canReturnRaw) {
                    resolve(baseJSON.data[0].table[0]);
                    return;
                } else {
                    var englishObj = await utils.translateToEnglish("cardInfo", baseJSON.data[0].table[0]);
                    resolve(englishObj);
                    return;
                }
            } catch (exp) {
                reject(exp);
                return;
            }
        });
    }

    /**
     * Get card usage data.
     * @param {string} cardNumber The card number, 16 digits long.
     * @param {boolean} canReturnRaw Return cardUsageArrayRaw instead of cardUsageArray.
     * @returns {Promise<Array>}
     */
    getCardUsage(cardNumber, canReturnRaw) {
        return new Promise(async(resolve, reject) => {
            try {
                if (typeof (cardNumber) !== "string") throw new Error("Card number must be a string.");
                if (parseInt(cardNumber).toString().length !== 16) throw new Error("Card number must be 16 digits long.");

                await this.autoAuthorize();

                var base = await request(utils.generateConfig(this.options, this.options.secondaryServer, "AnkaraKartKullanim", {
                    "KART": cardNumber
                }));
                var baseJSON = utils.cleanParse(base);

                if (baseJSON.data[0].status !== "TRUE") throw new Error("Status on API returning false (getCardUsage, baseJSON)");

                if (baseJSON.data[0].table.length === 0) {
                    resolve([]);
                    return;
                }

                if (canReturnRaw) {
                    resolve(baseJSON.data[0].table);
                    return;
                } else {
                    var englishObj = await utils.translateToEnglish("cardUsage", baseJSON.data[0].table);
                    resolve(englishObj);
                    return;
                }
            } catch (exp) {
                reject(exp);
                return;
            }
        });
    }
}

/**
 * Utilites for AnkaraKart Class.
 * @author İlteriş Eroğlu
 * @private
 */
class utils {
    /**
     * Generates config for request().
     * @param {options} options The options of the main class.
     * @param {string} ipAddress The target (IP) address.
     * @param {string} requestFunc The function to request.
     * @param {object} formData The form data of the function.
     */
    static generateConfig(options, ipAddress, requestFunc, formData) {
        if (!options || (options && typeof (options) !== "object")) throw new Error("options is not provided");
        if (!ipAddress) throw new Error("ip address is missing");
        if (!requestFunc) throw new Error("request function is missing");
        if ((formData && typeof (formData) !== "object")) throw new Error("form data is not an object");


        var appVersion = options.appVersion,
            appLanguage = "tr",
            appGUID = options.appGUID,
            phoneModel = options.phoneModel,
            phoneOperatingSystemVersion = options.phoneOperatingSystemVersion;

        var target = (this.isIPV4(ipAddress) ? `http://${ipAddress}/mbl/android` : `${ipAddress}/mbl/android`);

        var main = {
            method: "POST",
            headers: {
                "User-Agent": `EGO Genel Mudurlugu-EGO Cepte-${appVersion} ${phoneModel} ${phoneOperatingSystemVersion}`,
                "Connection": "keep-alive",
                "content-type": "application/x-www-form-urlencoded"
            },
            qs: {
                SID: Math.random().toString(),
                VER: appVersion,
                LAN: appLanguage,
                UID: appGUID
            },
            encoding: null
        };

        switch (requestFunc.toLowerCase()) {
        case "connect":
            main.qs.FNC = "Connect";
            main.url = `${target}/connect.asp`;
            main.form = {
                UID: appGUID,
                UPS: "TRUE"
            };
            break;
        case "start":
            main.qs.FNC = "Start";
            main.url = `${target}/connect.asp`;
            break;
        default:
            main.qs.FNC = requestFunc;
            main.url = `${target}/action.asp`;
            if (formData) {
                main.form = formData;
            }
            break;
        }

        return main;
    }

    /**
     * Parses the invalid JSON object.
     * @param {string} body The incorrect JSON object.
     */
    static cleanParse(body) {
        return JSON.parse(iconv.decode(body, "windows-1254").replace(/'/g, "\""));
    }

    /**
     * Translates cardObject or cardUsageArray to English.
     * @param {string} type cardInfo or cardUsage
     * @param {Object} object cardObject or cardUsage((Array))
     */
    static translateToEnglish(type, object) {
        if (typeof (object) !== "object") throw new Error("not a valid object");
        var returningUsage = [],
            returning = {};
        switch (type.toLowerCase()) {
        case "cardinfo":
            returning.cardNumber = object.kart,
            returning.lastUpdated = this.convertTime("cardInfo", object.tarih),
            returning.credit = object.bakiye,
            returning.result = object.result,
            returning.message = this.vocabTranslate(object.message);
            return returning;
        case "cardusage":
            for (const usageData of object) {
                var ret = {};
                ret.cardNumber = usageData.kart_no,
                ret.date = this.convertTime("cardUsage", usageData.tarih),
                ret.operation = this.vocabTranslate(usageData.islem),
                ret.carType = this.vocabTranslate(usageData.arac);
                if (ret.carType === "Bus" || usageData.arac_no.length > 0) {
                    ret.carNumber = usageData.arac_no,
                    ret.carLine = usageData.hat;
                }
                ret.creditSpent = usageData.dusen,
                ret.creditRemaining = usageData.kalan;
                returningUsage.push(ret);
            }
            return returningUsage;
        default:
            return object;
        }
    }

    /**
     * Converts the local time string to a parsable timestamp.
     * @param {string} type cardInfo or cardUsage((object))
     * @param {string} timeStr The time string.
     */
    static convertTime(type, timeStr) {
        switch (type.toLowerCase()) {
        case "cardinfo":
            var infoStr = timeStr.split(" "),
                infoDate = infoStr[0].split(".").reverse().join("-"),
                infoFinal = `${infoDate} ${infoStr[1]}`;
            return moment.tz(infoFinal, "Europe/Istanbul").format();
        case "cardusage":
            var usageStr = timeStr.split(" "),
                usageDate = usageStr[0].split("/").reverse().join("-"),
                usageFinal = `${usageDate} ${usageStr[1]}`;
            return moment.tz(usageFinal, "Europe/Istanbul").format();
        }
    }

    /**
     * Checks the incoming string and translates it.
     * @param {string} str The string to be translated.
     */
    static vocabTranslate(str) {
        switch (str.toLowerCase()) {
        case "ankaray":
            return "Ankaray";
        case "metro":
            return "Metro";
        case "otobüs":
            return "Bus";
        case "sorgulama başarılı":
            return "Query Successful";
        case "i̇lk bi̇ni̇ş":
            return "First Entry";
        case "i̇ki̇nci̇ ki̇şi̇":
            return "Second Person";
        case "aktarma":
            return "Transfer";
        case "geçersiz kart":
            return "Invalid Card";
        default:
            return str;
        }
    }

    /**
     * Checks if the string is a valid IPv4 address.
     * @param {string} str 
     */
    static isIPV4(str) {
        if (/^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(str)) {
            return true;
        } else {
            return false;
        }
    }
}

module.exports = AnkaraKart;
