const kafka = require('kafka-node');
const { KafkaClient, Producer } = kafka;

// Configuration options
const kafkaHost = 'kafka:9092'; // Change this if needed

// Create a Kafka client
const client = new KafkaClient({ kafkaHost });

// Create a Producer instance
const producer = new Producer(client);

producer.on('ready', () => {
    console.log(' Kafka Producer is connected and ready.');
});

producer.on('error', (error) => {
    console.error(' Producer encountered an error:', error);
});

/**
 * Send a message to a Kafka topic
 * @param {String} topic - The topic to send the message to
 * @param {Object} message - The message to send
 */
function sendMessage(topic, message) {
    try {
        const formattedMessage = JSON.stringify(message);

        const payloads = [
            {
                topic: topic,
                messages: formattedMessage
            }
        ];

        console.log("📤 Payload being sent:", payloads);

        producer.send(payloads, (error, data) => {
            if (error) {
                console.error(' Failed to send message:', error);
                return;
            }
            console.log(' Message sent successfully:', data);
        });
    } catch (err) {
        console.error(" Error in sendMessage function:", err);
    }
}

module.exports = {
    sendMessage
};
