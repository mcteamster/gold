import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as apigatewayv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as scheduler from 'aws-cdk-lib/aws-scheduler';
import { Construct } from 'constructs';
import * as path from 'path';

export class GoldStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // ──────────────────────────────────────────────
    // DynamoDB Tables (Task 3)
    // ──────────────────────────────────────────────

    // Connections table: PK=connectionId, TTL=ttl, GSI on roomID
    const connectionsTable = new dynamodb.Table(this, 'ConnectionsTable', {
      tableName: 'gold-connections',
      partitionKey: { name: 'connectionId', type: dynamodb.AttributeType.STRING },
      timeToLiveAttribute: 'ttl',
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });
    connectionsTable.addGlobalSecondaryIndex({
      indexName: 'roomID-index',
      partitionKey: { name: 'roomID', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // Game state table: PK=roomID
    const gameStateTable = new dynamodb.Table(this, 'GameStateTable', {
      tableName: 'gold-gamestate',
      partitionKey: { name: 'roomID', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // ──────────────────────────────────────────────
    // EventBridge Scheduler Group (Task 8.8)
    // ──────────────────────────────────────────────
    const schedulerGroup = new scheduler.CfnScheduleGroup(this, 'GoldSchedulerGroup', {
      name: 'gold-turns',
    });
    const schedulerGroupName = schedulerGroup.name ?? 'gold-turns';

    // ──────────────────────────────────────────────
    // IAM: Lambda execution role (Task 4.7)
    // ──────────────────────────────────────────────
    const lambdaRole = new iam.Role(this, 'GoldLambdaRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
      ],
    });

    connectionsTable.grantReadWriteData(lambdaRole);
    gameStateTable.grantReadWriteData(lambdaRole);

    lambdaRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'scheduler:CreateSchedule',
        'scheduler:DeleteSchedule',
        'scheduler:GetSchedule',
      ],
      resources: [
        `arn:aws:scheduler:${this.region}:${this.account}:schedule/${schedulerGroupName}/*`,
      ],
    }));

    // IAM: Scheduler invoke role
    const schedulerRole = new iam.Role(this, 'GoldSchedulerRole', {
      assumedBy: new iam.ServicePrincipal('scheduler.amazonaws.com'),
    });

    // ──────────────────────────────────────────────
    // WebSocket API (Task 4.6)
    // ──────────────────────────────────────────────
    const webSocketApi = new apigatewayv2.WebSocketApi(this, 'GoldWebSocketApi', {
      apiName: 'gold-ws-api',
    });

    const webSocketStage = new apigatewayv2.WebSocketStage(this, 'GoldWebSocketStage', {
      webSocketApi,
      stageName: 'prod',
      autoDeploy: true,
    });

    const callbackUrl = `https://${webSocketApi.apiId}.execute-api.${this.region}.amazonaws.com/${webSocketStage.stageName}`;

    // execute-api:ManageConnections
    lambdaRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['execute-api:ManageConnections'],
      resources: [
        `arn:aws:execute-api:${this.region}:${this.account}:${webSocketApi.apiId}/*`,
      ],
    }));

    // ──────────────────────────────────────────────
    // Shared Lambda environment (Tasks 4.5)
    // ──────────────────────────────────────────────
    const commonEnv: Record<string, string> = {
      CONNECTIONS_TABLE: connectionsTable.tableName,
      GAMESTATE_TABLE: gameStateTable.tableName,
      SCHEDULER_GROUP: schedulerGroupName,
      CALLBACK_URL: callbackUrl,
    };

    // cardData.json source path (relative to service dir)
    const cardDataSrc = path.join(__dirname, '..', 'data', 'cardData.json');

    // Common NodejsFunction bundling options (esbuild)
    const bundling: lambdaNodejs.BundlingOptions = {
      externalModules: [],
      // Include cardData.json alongside the bundle output
      commandHooks: {
        beforeBundling(_inputDir: string, _outputDir: string): string[] {
          return [];
        },
        afterBundling(_inputDir: string, outputDir: string): string[] {
          return [`cp "${cardDataSrc}" "${outputDir}/"`];
        },
        beforeInstall(_inputDir: string, _outputDir: string): string[] {
          return [];
        },
      },
    };

    const handlerDir = path.join(__dirname, '..', 'src');

    // ──────────────────────────────────────────────
    // Lambda handlers (Tasks 4.1–4.4)
    // ──────────────────────────────────────────────
    const connectFn = new lambdaNodejs.NodejsFunction(this, 'ConnectHandler', {
      functionName: 'gold-connect',
      runtime: lambda.Runtime.NODEJS_22_X,
      entry: path.join(handlerDir, 'handlers', 'connect.ts'),
      handler: 'handler',
      role: lambdaRole,
      environment: commonEnv,
      timeout: cdk.Duration.seconds(10),
      bundling,
    });

    const disconnectFn = new lambdaNodejs.NodejsFunction(this, 'DisconnectHandler', {
      functionName: 'gold-disconnect',
      runtime: lambda.Runtime.NODEJS_22_X,
      entry: path.join(handlerDir, 'handlers', 'disconnect.ts'),
      handler: 'handler',
      role: lambdaRole,
      environment: commonEnv,
      timeout: cdk.Duration.seconds(10),
      bundling,
    });

    const messageFn = new lambdaNodejs.NodejsFunction(this, 'MessageHandler', {
      functionName: 'gold-message',
      runtime: lambda.Runtime.NODEJS_22_X,
      entry: path.join(handlerDir, 'handlers', 'message.ts'),
      handler: 'handler',
      role: lambdaRole,
      environment: commonEnv,
      timeout: cdk.Duration.seconds(10),
      bundling,
    });

    const nextTurnFn = new lambdaNodejs.NodejsFunction(this, 'NextTurnHandler', {
      functionName: 'gold-next-turn',
      runtime: lambda.Runtime.NODEJS_22_X,
      entry: path.join(handlerDir, 'handlers', 'nextTurn.ts'),
      handler: 'handler',
      role: lambdaRole,
      environment: commonEnv,
      timeout: cdk.Duration.seconds(30),
      bundling,
    });

    // Allow scheduler to invoke nextTurn
    schedulerRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['lambda:InvokeFunction'],
      resources: [nextTurnFn.functionArn],
    }));

    // Pass nextTurn ARN and scheduler role ARN to both message and nextTurn handlers.
    // nextTurnFn needs its own ARN to re-schedule itself for subsequent turns;
    // AWS_ACCOUNT_ID is NOT a standard Lambda runtime env var, so we must inject it explicitly
    // rather than relying on the fallback ARN construction in scheduler.ts.
    messageFn.addEnvironment('NEXT_TURN_FUNCTION_ARN', nextTurnFn.functionArn);
    messageFn.addEnvironment('SCHEDULER_ROLE_ARN', schedulerRole.roleArn);
    nextTurnFn.addEnvironment('NEXT_TURN_FUNCTION_ARN', nextTurnFn.functionArn);
    nextTurnFn.addEnvironment('SCHEDULER_ROLE_ARN', schedulerRole.roleArn);

    // ──────────────────────────────────────────────
    // WebSocket Routes (Task 4.6)
    // ──────────────────────────────────────────────
    webSocketApi.addRoute('$connect', {
      integration: new integrations.WebSocketLambdaIntegration('ConnectIntegration', connectFn),
    });
    webSocketApi.addRoute('$disconnect', {
      integration: new integrations.WebSocketLambdaIntegration('DisconnectIntegration', disconnectFn),
    });
    webSocketApi.addRoute('$default', {
      integration: new integrations.WebSocketLambdaIntegration('MessageIntegration', messageFn),
    });

    // ──────────────────────────────────────────────
    // Stack Outputs
    // ──────────────────────────────────────────────
    new cdk.CfnOutput(this, 'WebSocketEndpoint', {
      value: webSocketStage.url,
      description: 'WebSocket endpoint URL (wss://)',
      exportName: 'GoldWebSocketEndpoint',
    });

    new cdk.CfnOutput(this, 'NextTurnFunctionArn', {
      value: nextTurnFn.functionArn,
      description: 'NextTurn Lambda ARN',
    });
  }
}
