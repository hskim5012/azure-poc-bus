import {
    ServiceBusClient,
    ServiceBusSender,
    ServiceBusReceiver,
    ServiceBusReceivedMessage,
} from '@azure/service-bus';
import { config } from '../config';
import { WorkflowEvent } from '../models/WorkflowEvent';
import { logger } from '../logger';

export class ServiceBusService {
    private client: ServiceBusClient;
    private topicSender: ServiceBusSender | null = null;
    private receivers: Map<string, ServiceBusReceiver>;

    constructor() {
        this.client = new ServiceBusClient(config.serviceBusConnectionString);
        this.receivers = new Map();
    }

    /**
     * Publish an event to the main Workflow Events Topic
     */
    async publishEvent(event: WorkflowEvent): Promise<void> {
        try {
            if (!this.topicSender) {
                this.topicSender = this.client.createSender(config.topic.name);
            }

            const serviceBusMessage = {
                body: event,
                contentType: 'application/json',
                // Critical for Pub/Sub: We add the eventType as a custom property 
                // so Azure Service Bus can route it using SQL Filters
                applicationProperties: {
                    eventType: event.eventType
                }
            };

            await this.topicSender.sendMessages(serviceBusMessage);
            logger.debug(`Published event ${event.eventType} to topic`, { workflowId: event.workflowId });
        } catch (error) {
            logger.error(`Failed to publish event ${event.eventType}`, error);
            throw error;
        }
    }

    /**
     * Create a receiver for a specific Subscription on the Topic
     */
    createSubscriptionReceiver(subscriptionName: string): ServiceBusReceiver {
        let receiver = this.receivers.get(subscriptionName);
        if (!receiver) {
            receiver = this.client.createReceiver(config.topic.name, subscriptionName);
            this.receivers.set(subscriptionName, receiver);
        }
        return receiver;
    }

    /**
     * Parse a Service Bus message into a WorkflowEvent
     */
    parseWorkflowEvent(message: ServiceBusReceivedMessage): WorkflowEvent {
        // Sometimes the body is a Buffer, string, or already parsed object depending on how it was sent/received
        let event = message.body;
        if (typeof event === 'string') {
            try {
                event = JSON.parse(event);
            } catch (e) {
                // Ignore parsing error, will be handled if eventType is missing
            }
        }

        event = event as WorkflowEvent;
        // Convert date strings back to Date objects
        if (event.createdAt) {
            event.createdAt = new Date(event.createdAt);
        }
        return event;
    }

    /**
     * Close all connections
     */
    async close(): Promise<void> {
        logger.info('Closing Service Bus connections...');

        // Close sender
        if (this.topicSender) {
            await this.topicSender.close();
            logger.debug(`Closed sender for topic: ${config.topic.name}`);
        }

        // Close all receivers
        for (const [subscriptionName, receiver] of this.receivers.entries()) {
            await receiver.close();
            logger.debug(`Closed receiver for subscription: ${subscriptionName}`);
        }

        // Close the client
        await this.client.close();
        logger.info('All Service Bus connections closed');
    }
}
