// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as cdk from '@aws-cdk/core';
import { ServerlessImageHandler, ServerlessImageHandlerProps } from './serverless-image-handler';
import { CfnParameter } from '@aws-cdk/core';

const { VERSION } = process.env;

/**
 * @class ConstructsStack
 */
export class ConstructsStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // CFN parameters
    const corsEnabledParameter = new CfnParameter(this, 'CorsEnabled', {
      type: 'String',
      description: `Would you like to enable Cross-Origin Resource Sharing (CORS) for the image handler API? Select 'Yes' if so.`,
      default: 'No',
      allowedValues: [ 'Yes', 'No' ]
    });
    const corsOriginParameter = new CfnParameter(this, 'CorsOrigin', {
      type: 'String',
      description: `If you selected 'Yes' above, please specify an origin value here. Supports multiple origins given either as comma-separated string or RegExp.`,
      default: '*'
    });
    const sourceBucketsParameter = new CfnParameter(this, 'SourceBuckets', {
      type: 'String',
      description: '(Required) List the buckets (comma-separated) within your account that contain original image files. If you plan to use Thumbor or Custom image requests with this solution, the source bucket for those requests will be the first bucket listed in this field.',
      default: 'defaultBucket, bucketNo2, bucketNo3, ...',
      allowedPattern: '.+'
    });
    const deployDemoUiParameter = new CfnParameter(this, 'DeployDemoUI', {
      type: 'String',
      description: 'Would you like to deploy a demo UI to explore the features and capabilities of this solution? This will create an additional Amazon S3 bucket and Amazon CloudFront distribution in your account.',
      default: 'Yes',
      allowedValues: [ 'Yes', 'No' ]
    });
    const logRetentionPeriodParameter = new CfnParameter(this, 'LogRetentionPeriod', {
      type: 'Number',
      description: 'This solution automatically logs events to Amazon CloudWatch. Select the amount of time for CloudWatch logs from this solution to be retained (in days).',
      default: '1',
      allowedValues: [ '1', '3', '5', '7', '14', '30', '60', '90', '120', '150', '180', '365', '400', '545', '731', '1827', '3653' ]
    });
    const autoWebPParameter = new CfnParameter(this, 'AutoWebP', {
      type: 'String',
      description: `Would you like to enable automatic WebP based on accept headers? Select 'Yes' if so.`,
      default: 'No',
      allowedValues: [ 'Yes', 'No' ]
    });

    // CFN descrption
    this.templateOptions.description = `(SO0023) - Serverless Image Handler with aws-solutions-constructs: This template deploys and configures a serverless architecture that is optimized for dynamic image manipulation and delivery at low latency and cost. Leverages SharpJS for image processing. Template version ${VERSION}`;

    // CFN template format version
    this.templateOptions.templateFormatVersion = '2010-09-09';

    // CFN metadata
    this.templateOptions.metadata = {
      'AWS::CloudFormation::Interface': {
        ParameterGroups: [
          {
            Label: { default: 'CORS Options' },
            Parameters: [ corsEnabledParameter.logicalId, corsOriginParameter.logicalId ]
          },
          {
            Label: { default: 'Image Sources' },
            Parameters: [ sourceBucketsParameter.logicalId ]
          },
          {
            Label: { default: 'Demo UI' },
            Parameters: [ deployDemoUiParameter.logicalId ]
          },
          {
            Label: { default: 'Event Logging' },
            Parameters: [ logRetentionPeriodParameter.logicalId ]
          }
        ]
      }
    };

    // Mappings
    new cdk.CfnMapping(this, 'Send', {
      mapping: {
        AnonymousUsage: {
          Data: 'Yes'
        }
      }
    });

    // Serverless Image Handler props
    const sihProps: ServerlessImageHandlerProps = {
      corsEnabledParameter,
      corsOriginParameter,
      sourceBucketsParameter,
      deployDemoUiParameter,
      logRetentionPeriodParameter,
      autoWebPParameter
    };

    // Serverless Image Handler Construct
    const serverlessImageHander = new ServerlessImageHandler(this, 'ServerlessImageHandler', sihProps);

    // Outputs
    new cdk.CfnOutput(this, 'ApiEndpoint', {
      value: cdk.Fn.sub('https://${ImageHandlerDistribution.DomainName}'),
      description: 'Link to API endpoint for sending image requests to.'
    });
    new cdk.CfnOutput(this, 'DemoUrl', {
      value: cdk.Fn.sub('https://${DemoDistribution.DomainName}/index.html'),
      description: 'Link to the demo user interface for the solution.',
      condition: serverlessImageHander.node.findChild('DeployDemoUICondition') as cdk.CfnCondition
    });
    new cdk.CfnOutput(this, 'SourceBucketsOutput', {
      value: sourceBucketsParameter.valueAsString,
      description: 'Amazon S3 bucket location containing original image files.'
    }).overrideLogicalId('SourceBuckets');
    new cdk.CfnOutput(this, 'CorsEnabledOutput', {
      value: corsEnabledParameter.valueAsString,
      description: 'Indicates whether Cross-Origin Resource Sharing (CORS) has been enabled for the image handler API.'
    }).overrideLogicalId('CorsEnabled');
    new cdk.CfnOutput(this, 'CorsOriginOutput', {
      value: corsOriginParameter.valueAsString,
      description: 'Origin value returned in the Access-Control-Allow-Origin header of image handler API responses.',
      condition: serverlessImageHander.node.findChild('EnableCorsCondition') as cdk.CfnCondition
    }).overrideLogicalId('CorsOrigin');
    new cdk.CfnOutput(this, 'LogRetentionPeriodOutput', {
      value: cdk.Fn.ref('LogRetentionPeriod'),
      description: 'Number of days for event logs from Lambda to be retained in CloudWatch.'
    }).overrideLogicalId('LogRetentionPeriod');
  }
}
