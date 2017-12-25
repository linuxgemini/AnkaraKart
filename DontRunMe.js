"use strict";

if (process.version.slice(1).split(".")[0] < 8) throw new Error("Node 8.0.0 or higher is required. Update Node on your system.");

const fs = require("fs");
const guidGen = require("uuid/v4");
const request = require("request-promise-native");
const cheerio = require("cheerio");

const latestKnownVersion = "3.0.6";

/**
 * Picks a random number in the specified limits.
 * @param {number} min Minimum
 * @param {number} max Maximum
 * @returns {number}
 */
const randNumGen = (min, max) => {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
};

/**
 * Picks random item from an Array.
 * @param {array} arr 
 * @returns {any}
 */
const pickRand = (arr) => {
    if (!Array.isArray(arr)) return;
    return arr[Math.floor(Math.random() * arr.length)];
};

const phones = ["Nexus 5X", "Nexus 6P", "Galaxy C9 Pro", "GM 5 Plus d"];
const osVersions = ["7.0.1", "8.0.1", "7.1.2", "6.0.1"];

/**
 * Builds a custom GUID.
 * @returns {string}
 */
const guidBuilder = () => {
    return `{${guidGen().toUpperCase()}}-${randNumGen(111111111, 999999999)}`;
};

/**
 * Fetches the latest version number from the target URL.
 * @returns {string}
 */
const fetchVersion = async () => {
    try {
        var body = await request("https://play.google.com/store/apps/details?id=com.ego.android");
        const $ = cheerio.load(body);
        if ($("div[itemprop=softwareVersion]").text().replace(/\s/g, "").length === 0) throw new Error("version not found");
        const version = $("div[itemprop=softwareVersion]").text().replace(/\s/g, "");
        return version;
    } catch (exception) {
        return latestKnownVersion;
    }
};

/**
 * The config object builder.
 * @returns {object}
 */
const finalBuilder = async () => {
    var obj = {};
    obj.phoneModel = pickRand(phones),
    obj.appGUID = guidBuilder(),
    obj.appVersion = await fetchVersion(),
    obj.phoneOperatingSystemVersion = pickRand(osVersions);
    return JSON.stringify(obj, null, "  ");
};

/**
 * The main function to be executed.
 * @author İlteriş Eroğlu
 */
const main = async () => {
    let config = await finalBuilder();
    fs.writeFileSync("./DO-NOT-DELETE-ME.json", config);
    return setTimeout(() => {
        process.exit(0);
    }, 2500);
};

main();
