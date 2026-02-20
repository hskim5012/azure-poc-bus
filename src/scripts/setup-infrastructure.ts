import { ServiceBusAdministrationClient } from '@azure/service-bus';
import { config } from '../config';
import { logger } from '../logger';
import { EventType } from '../models/WorkflowEvent';

async function setupInfrastructure() {
    logger.info('Starting Azure Service Bus Pub/Sub Infrastructure Setup...');

    if (!config.serviceBusConnectionString) {
        logger.error('AZURE_SERVICEBUS_CONNECTION_STRING environment variable is not set correctly.');
        process.exit(1);
    }

    const adminClient = new ServiceBusAdministrationClient(config.serviceBusConnectionString);
    const topicName = config.topic.name;

    try {
        // 1. Create Topic
        const topicExists = await adminClient.topicExists(topicName);
        if (!topicExists) {
            logger.info(`Creating Topic: ${topicName}...`);
            await adminClient.createTopic(topicName, {
                maxSizeInMegabytes: 1024,
            });
            logger.info(`✓ Topic ${topicName} created successfully.`);
        } else {
            logger.info(`✓ Topic ${topicName} already exists. Skipping creation.`);
        }

        // 2. Define Subscriptions and their SQL Filters
        // We filter based on the custom property 'eventType' we set in publishEvent()
        const subscriptionConfigs = [
            {
                name: config.subscriptions.claimLoading,
                // ClaimLoading only cares about 'WorkflowStarted' events
                filterRule: `eventType = '${EventType.WorkflowStarted}'`
            },
            {
                name: config.subscriptions.claimAudit,
                // ClaimAudit only cares about 'ClaimLoadingCompleted' events
                filterRule: `eventType = '${EventType.ClaimLoadingCompleted}'`
            },
            {
                name: config.subscriptions.b1Move,
                // B1Move only cares about 'ClaimAuditCompleted' events
                filterRule: `eventType = '${EventType.ClaimAuditCompleted}'`
            },
            {
                name: config.subscriptions.b2Move,
                // B2Move only cares about 'B1MoveCompleted' events
                filterRule: `eventType = '${EventType.B1MoveCompleted}'`
            }
        ];

        // 3. Create Subscriptions and apply Rules
        for (const subConfig of subscriptionConfigs) {
            const subExists = await adminClient.subscriptionExists(topicName, subConfig.name);

            if (!subExists) {
                logger.info(`Creating Subscription: ${subConfig.name}...`);
                await adminClient.createSubscription(topicName, subConfig.name, {
                    maxDeliveryCount: 10,
                    lockDuration: 'PT5M', // 5 minutes standard format
                    deadLetteringOnMessageExpiration: true
                });
                logger.info(`✓ Subscription ${subConfig.name} created.`);

                // Important: When creating a subscription, Azure adds a default "$Default" rule 
                // that accepts ALL messages (1=1). We need to delete it first.
                logger.info(`  - Removing default allow-all rule...`);
                await adminClient.deleteRule(topicName, subConfig.name, '$Default');

                // Now add our specific SQL filter rule
                logger.info(`  - Applying SQL Filter: ${subConfig.filterRule}`);
                await adminClient.createRule(topicName, subConfig.name, 'EventFilterRule', {
                    sqlExpression: subConfig.filterRule
                });
                logger.info(`✓ Filter applied for ${subConfig.name}.`);

            } else {
                logger.info(`✓ Subscription ${subConfig.name} already exists. Skipping creation.`);
            }
        }

        logger.info('\n=============================================');
        logger.info('Infrastructure Setup Complete!');
        logger.info('=============================================\n');

    } catch (error) {
        logger.error('Failed to setup infrastructure', error);
        process.exit(1);
    }
}

setupInfrastructure();
