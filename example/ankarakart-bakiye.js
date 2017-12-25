"use strict";

/**
 * Example code.
 * @author İlteriş Eroğlu
 */

if (process.version.slice(1).split(".")[0] < 8) throw new Error("Node 8.0.0 or higher is required. Update Node on your system.");

const AnkaraKart = require("../AnkaraKart");
const ankaraKart = new AnkaraKart();

/**
 * process.exit in an easy way.
 * @param {number} code 
 */
const exit = (code) => {
    if (!code) code = 0;
    return process.exit(code);
};

try {
    require("./c.json");
} catch (e) {
    console.error("Config is not set.");
    exit(1);
}

let config = require("./c.json");
let cardNumber = config.cardnumber;

if (cardNumber.length !== 16) {
    console.error("cardNumber is not defined.\nIt is usually the 16 digit number on the front of the card.");
    exit(1);
}

let isListingAllowed = config.showUsage;
let isDebugMode = config.debug;

/**
 * Promisified setTimeout, used like "sleep" (Bash-like)
 * @param {number} ms 
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Cheap-ass error handler.
 * @param {string} isFst On which step did the error happen?
 * @param {Object} err Error object.
 */
async function gotHit(isFst, err) {
    if (err) {
        console.log(`rip ${err.stack}`);
    } else {
        console.log(`server rip, on ${isFst} hit`);
    }
    await sleep(1000);
    return exit(1);
}


/**
 * Exit with code 0 with sleep-like setTimeout.
 * @param {number} ms Milliseconds
 */
async function safelyExit(ms) {
    await sleep(ms);
    return exit(0);
}

/**
 * Main function to be executed.
 */
async function main() {
    try {
        var cardInfo = await ankaraKart.getCardInfo(cardNumber);

        if (!isDebugMode) {
            console.log(`${cardInfo.cardNumber} has ${cardInfo.credit} Turkish Liras, last updated at ${Date(cardInfo.lastUpdated)}\n`);
        } else {
            console.log(cardInfo);
        }

        if (isListingAllowed) {
            var getCardUsage = await ankaraKart.getCardUsage(cardNumber);
            if (getCardUsage.length > 0) {
                for (const cardUsage of getCardUsage.reverse()) {
                    var carType;
                    switch (cardUsage.carType.toLowerCase()) {
                    case "ankaray":
                        carType = "Ankaray";
                        break;
                    case "metro":
                        carType = "Metro";
                        break;
                    case "bus":
                        carType = `bus (Car Number: ${cardUsage.carNumber}, Line: ${cardUsage.carLine})`;
                        break;
                    default:
                        carType = "bus or something (I don't have data for this)";
                        break;
                    }
                    if (!isDebugMode) {
                        console.log(`On ${new Date(cardUsage.date)}, you've used the ${carType} and spent ${cardUsage.creditSpent} Turkish Liras.`);
                    } else {
                        console.log(cardUsage);
                    }
                }
            } else {
                console.log("You've never used this card in the last 30 days.");
            }
        }
        return safelyExit(5000);
    } catch (e) {
        return gotHit("first", e);
    }
}

main();
