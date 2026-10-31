#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { GoldStack } from '../lib/gold-stack';

const app = new cdk.App();
new GoldStack(app, 'GoldStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: 'ap-southeast-2',
  },
});
