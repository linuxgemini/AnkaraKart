# AnkaraKart

Small wrapper for the transportation card used in Ankara, AnkaraKart.

Requirements
-----------
* [Node.js](https://nodejs.org/) version 8 or higher
* An AnkaraKart

Dependecies
-----------

* [request](https://www.npmjs.com/package/request) *(API and Setup)*
* [request-promise-native](https://www.npmjs.com/package/request-promise-native) *(API and Setup)*
* [moment-timezone](https://www.npmjs.com/package/moment-timezone) *(API only)*
* [iconv-lite](https://www.npmjs.com/package/iconv-lite) *(API only)*
* [cheerio](https://www.npmjs.com/package/cheerio) *(Setup only)*
* [node-uuid](https://www.npmjs.com/package/uuid) *(Setup only)*

Installation
-----------
It is an API what do you expect.

    ~/project/$ npm install --save ankarakart

On your project:

```js
const AnkaraKart = require("ankarakart");
const ankarakart = new AnkaraKart();
```

Functions
-----------

### ankarakart.getCardInfo(cardNumber, canReturnRaw)

Returns a Promise containing `cardObject`.
If *canReturnRaw* is set to `true`, it will return a Promise containing `cardObjectRaw`.

### ankarakart.getCardUsage(cardNumber, canReturnRaw)

Returns a Promise containing `cardUsageArray`.
If *canReturnRaw* is set to `true`, it will return a Promise containing `cardUsageArrayRaw`.
If the array is empty, that means the card is never used within the last 30 days.

### Other functions

You really don't need to use it manually, since the two above already uses them.

Objects
-----------

### cardObject

An object containing the card info.

#### cardNumber

16 digit string, containing the card number that was supplied to exectute the `ankarakart.getCardInfo()` function.
#### lastUpdated

Parsable date string, containing the last date that the card was used.

#### credit

String, containing the credit that the card has.

#### result

String that can be 1, (maybe) 2 or 3.

* 1 is for sucessful query
* 2 is `unknown`
* 3 is for invalid card

#### message

String, containing the response message from the query server.
This *can* be:

* Sorgulama Başarılı (Query Successful)
* Geçersiz Kart (Invalid Card) (**Though, this will return an error; see: Errors**)

### cardUsageArray

Contains `cardUsageObject`s. Sorted by date. First element of the array is the latest event. If the card haven't been used in the last 30 days, this array will be empty.

### cardUsageObject

#### cardNumber

16 digit string, containing the card number that was supplied to exectute the `ankarakart.getCardUsage()` function.

#### date

Parsable date string, contains the date of the current card usage.

#### operation

String, containing what happened on the current card usage.

This *can* be:

* İlk Biniş (First Entry)
* İkinci Kişi (Second Person)
* Aktarma (Transfer)

#### carType

String, contains the car type of the current card usage.

This *can* be:

* Ankaray
* Metro
* Otobüs (Bus)
* `Empty`, only happens when you get on a private bus that accepts AnkaraKart.

#### carNumber

String, containing the bus code like `xx-xxx`. Will be available if this data is not empty. lol

#### carLine

String, containing the bus line like `xxx`. Will be available if `carNumber` is not empty.

#### creditSpent

String, containing the credit that was spent on the current card usage.

#### creditRemaining

String, containing the credit that will remain *at the current card usage*.

### cardObjectRaw

The raw object containing the card info.

#### kart

Same as `cardObject.cardNumber`.

#### tarih

Sort of `cardObject.date` but formatted like `DD.MM.YYYY HH:mm:ss` in GMT+3

#### bakiye

Same as `cardbObject.credit`.

#### result

Same as `cardbObject.result` but not translated.

#### message

Same as `cardbObject.message` but not translated.

### cardUsageArrayRaw

The raw array containing `cardUsageObjectRaw`s. Sorted by date. First element of the array is the latest event. If the card haven't been used in the last 30 days, this array will be empty.

### cardUsageObjectRaw

#### kart_no

Same as `cardUsageObject.cardNumber`.

#### tarih

Sort of `cardUsageObject.date` but formatted like `DD/MM/YYYY HH:mm:ss` in GMT+3

#### islem

Same as `cardUsageObject.operation` but not translated.

#### arac

Same as `cardUsageObject.carType` but not translated.

#### arac_no

Same as `cardUsageObject.carNumber`.

#### hat

Same as `cardUsageObject.carLine`.

#### dusen

Same as `cardUsageObject.creditSpent`.

#### kalan

Same as `cardUsageObject.creditRemaining`.

Errors
-----------

Alright, I need to tell you this:

The code has lots of error-catchers, for easy debugging. If the static functions (anything under the non-exported class `AnkaraKart.utils`) fail somehow, that is not good.

On invalid cards, the API will also return an error. This for redundancy and to support both async/await and general Promise usage.
