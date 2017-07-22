// Based on > http://www.c-sharpcorner.com/article/an-interactive-bot-application-with-luis-using-microsoft-bot/
require('dotenv').config()
var restify = require('restify');
var builder = require('botbuilder');
var request = require('request');

// Setup Restify Server
var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
   console.log('%s listening to %s', server.name, server.url); 
});

// Create chat connector for communicating with the Bot Framework Service
var connector = new builder.ChatConnector({
    appId: process.env.MICROSOFT_APP_ID,
    appPassword: process.env.MICROSOFT_APP_PASSWORD
});

// Listen for messages from users 
server.post('/api/messages', connector.listen());

// Configuration of the 'text' recognizer. In our case, LUIS but you could have a custom one
var recognizer = new builder.LuisRecognizer(process.env.LUIS_MODEL_URL);

// Create the bot and assign the recognizer
var bot = new builder.UniversalBot(connector)
bot.recognizer(recognizer);

// Add a catch all. If we don't understand then... we arrive here.
bot.dialog(`/`, function (session, args){
  session.send('kind of lost here... sorry')
  session.endDialog();
})

// This is triggered when it find an intent of 'stock price'
bot.dialog('Stockprice', function (session, args) {
  session.send('StockPrice! We are analyzing your message: \'%s\'', session.message.text);

  console.log(JSON.stringify(args.intent.entities))
  var stockSymbol = builder.EntityRecognizer.findEntity(args.intent.entities, 'StockSymbol');
  console.log('trying to output something' + JSON.stringify(stockSymbol))

  fetchStockPrice(stockSymbol.entity, session);
}).triggerAction({
  matches: 'Stockprice'
  // other options can come here.
});

// Call to yahoo stock
function fetchStockPrice(stockCode, session){
  
  var requestOptions = {
    'url': `http://finance.yahoo.com/d/quotes.csv?s=${stockCode}&f=sl1d1nd`
  }

  if (process.env.proxy !== undefined && process.env.proxy !== null){
    requestOptions.proxy = process.env.proxy
  }

  return request(requestOptions, function (error, response, body) {

    if (response.statusCode == 404) {
      session.send("This \"{0}\" is not an valid stock symbol") // never get here... except if you added some stock that does not exists in the feature list (LUIS)
    }

    if (body !== null && body.indexOf(',') >= 0) // CSV contents
    {
      var data = body.split(',')
      console.log(`DEBUG> Stock price : ${data[1]}`) // Price is the 2nd column in the CSV
      session.send(`The price for ${stockCode} is ${data[1]}`)
    }

    session.endDialog();
  });
}