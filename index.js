'use strict';
// const means that the identifier cannot be re-assigned, it is not 
// immutable as the properties of the object can be mutated
const PAGE_ACCESS_TOKEN = process.env.FBAPIKEY;

const express    = require('express');
const bodyParser = require('body-parser');
const request    = require('request');
const port       = process.env.PORT || 1337

const app = express();
    
    app.use(bodyParser.json());

    // creates an endpoint for our webhook
    app.post('/webhook', (req, res) => {

        let body = req.body;

        // Checks if this is an event from a page subscription
        if(body.object === 'page') {   
            // Iterates over each entry - there may be multiple if batched
            body.entry.forEach(function(entry){
                
                // Gets the message. entry.messaging is an array, but
                // will only ever contain one message, so we get index 0
                let webhookEvent = entry.messaging[0];
                console.log(webhookEvent);

                // Get the sender PSID
                let sender_psid = webhookEvent.sender.id;
                console.log('Sender PSID: ' + sender_psid);

                // Check if the event is a message or postback and
                // pass the event to the appropriate handler function
                if(webhookEvent.message) {
                    handleMessage(sender_psid, webhookEvent.message);
                } else if (webhookEvent.postback) {
                    handlePostback(sender_psid, webhookEvent.postback);
                }
            })

            // Returns a '200 OK response to all requests
            res.status(200).send('EVENT_RECEIVED');
        } else {
            // Returns a '404 NOT FOUND' if event is not from a page subscription
            res.sendStatus(404);
        }
    })

    // Adds support for GET requests to our webhook
    app.get('/webhook', (req, res) => {

        // Your verify token. Should be a random string
        let VERIFY_TOKEN = "HABIBI_LUFF";

        // Parse the query params
        let mode = req.query['hub.mode'];
        let token = req.query['hub.verify_token'];
        let challenge = req.query['hub.challenge'];

        // Checks if a token and mode is in the query string of the request
        if(mode && token) {

            // Checks the mode and token sent is correct
            if(mode == 'subscribe' && token === VERIFY_TOKEN) {

                // Responds with the challenge token from the request
                console.log('WEBHOOK_VERIFIED');
                res.status(200).send(challenge);

            } else {
                // Responds with '403 FORBIDDEN' if verify tokens do not match
                res.sendStatus(403);
            }
        }
    })

    // Handles messages events
    // This callback will occur when a message has been sent to your page
    // You may receive text messages or messages with attachments (img, audio, file..etc)
    function handleMessage(sender_psid, received_message) {

        let response;

        // Check if the message contains text
        if(received_message.text) {

            // Create the payload for a basic message
            response = {
                "text" : `You sent the message: "${received_message.text}". Now send me an image!`
            }
        } else if (received_message.attachments) {

            // Gets the URL of the message attachment
            let attachment_url = received_message.attachments[0].payload.url;
            response = {
                "attachment": {
                    "type": "template",
                    "payload": {
                        "template_type": "generic",
                        "elements" : [{
                            "title": "Is this the right picture?",
                            "subtitle": "Tap a button to answer",
                            "image_url": attachment_url,
                            "buttons": [{
                                "type": "postback",
                                "title": "Yes!",
                                "payload": "yes"
                            },
                            {
                                "type": "postback",
                                "title": "No!",
                                "payload": "no"
                            }
                            ],
                        }
                        ]
                    }
                }
            }
        }

        callSendAPI(sender_psid, response);

    }

    // Handles messaging_postbacks events
    // Postbacks occur when a postback button, Get Started Button, 
    // or persistent menu item is tapped. The paylod field passed is defined in the
    // above places
    function handlePostback(sender_psid, received_postback) {

        let response;

        // Get the payload for the postback
        let payload = received_postback.payload;

        // Set the response based on the postback payload
        if(payload === 'yes') {
            response = { "text": "Thanks!" }
        } else if (payload === 'no') {
            response = { "text": "Oops, try sending another image." }
        }

        // Send the message to acknowledge the postback
        callSendAPI(sender_psid, response);
    }
    // Sends response messages via the Send API
    function callSendAPI(sender_psid, response) {
        
        // Construct the message body
        let request_body = {
            "recipient": {
                "id": sender_psid
            },
            "message": response
        }

        request({
            "uri": "https://graph.facebook.com/v2.6/me/messages",
            "qs": {"access_token": PAGE_ACCESS_TOKEN },
            "method": "POST",
            "json": request_body,
            }, (err, res, body) => {
                if(!err) {
                    console.log('messenge sent!');
                } else { 
                    console.log("Unable to send message:" + err);
                }
            })
    }
    
    app.listen(port, () => console.log('webbook is listening'));
    