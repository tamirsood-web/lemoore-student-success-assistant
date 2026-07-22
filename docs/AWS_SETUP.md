# AWS Setup Checklist

> **Current Local MVP Status (additive note).** None of the AWS resources below are
> provisioned or deployed yet. The current MVP runs **entirely locally** using deterministic
> local mock implementations behind fixed interfaces (retrieval, guardrail, and feedback
> seams), and requires **no AWS account, no paid API, and no live model**. This checklist
> describes the **planned** later AWS phase. The reserved AWS environment variable names are
> optional placeholders in `.env.example`, and the app boots without them. Do not provision
> AWS resources for the local MVP. See the README "Local Development" and "Architecture
> Seams" sections for what exists today versus what is planned.

Record actual values as the team provisions resources. Do not commit secrets.

## Region

Choose one AWS region supported by all selected Bedrock models and services.

```text
AWS_REGION=
```

## Bedrock Model Access

- [ ] Confirm the selected chat model is available.
- [ ] Confirm an embedding model compatible with Knowledge Bases is available.
- [ ] Record the inference/model identifier in environment configuration.

```text
BEDROCK_MODEL_ID=
```

## S3 Knowledge Source

- [ ] Create a private bucket or dedicated prefix.
- [ ] Block public access.
- [ ] Upload only approved public/institutional source material.
- [ ] Do not upload student records.

```text
KNOWLEDGE_BUCKET_NAME=
KNOWLEDGE_PREFIX=
```

## Bedrock Knowledge Base

- [ ] Create one knowledge base.
- [ ] Connect the S3 data source.
- [ ] Allow the setup workflow to create/configure OpenSearch Serverless if fastest.
- [ ] Configure metadata handling.
- [ ] Run synchronization.
- [ ] Test retrieval in the AWS console.

```text
BEDROCK_KNOWLEDGE_BASE_ID=
BEDROCK_DATA_SOURCE_ID=
```

## Guardrail

Configure:

- sensitive-information filtering,
- denied topics for private student-record access,
- harmful-content filters,
- contextual grounding checks if available and practical.

```text
BEDROCK_GUARDRAIL_ID=
BEDROCK_GUARDRAIL_VERSION=
```

## Cognito

- [ ] Create user pool.
- [ ] Create app client.
- [ ] Create `ambassadors` group.
- [ ] Create `admins` group.
- [ ] Add demo accounts.
- [ ] Configure callback/logout URLs for local and deployed environments.

```text
COGNITO_USER_POOL_ID=
COGNITO_CLIENT_ID=
COGNITO_DOMAIN=
```

## DynamoDB

Create tables or one table matching the selected design.

```text
DYNAMODB_TABLE_NAME=
```

Recommended access patterns:

- write conversation metadata,
- write feedback,
- list recent unsupported questions,
- aggregate or scan small demo data for dashboard metrics.

## Amplify Hosting

- [ ] Connect Git repository.
- [ ] Select main demo branch.
- [ ] Configure build command.
- [ ] Add server-side environment variables.
- [ ] Confirm deployed SSR/API behavior.
- [ ] Confirm CloudWatch logs are available.

## IAM

The Next.js server role should receive only the permissions it needs:

- Bedrock retrieve-and-generate/inference
- Guardrail use as required
- limited DynamoDB actions on the application table
- CloudWatch logging
- no broad S3 access unless the runtime truly requires it

Knowledge Base service roles should be created according to AWS requirements with least privilege.

Do not use administrator credentials in the application.

## Local Development

Use an approved AWS profile or short-lived credentials.

Never commit:

- access-key IDs,
- secret-access keys,
- session tokens,
- Cognito client secrets,
- private source documents,
- production data.

## Setup Log

Record manual console changes here so another teammate can reproduce them:

```text
Date:
Person:
Resource:
Change:
Reason:
```
