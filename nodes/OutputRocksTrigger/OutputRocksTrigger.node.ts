import { IWebhookFunctions } from 'n8n-core';

import {
	ICredentialDataDecryptedObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IWebhookResponseData,
} from 'n8n-workflow';

import basicAuth from 'basic-auth';

import { Response } from 'express';

function authorizationError(resp: Response, realm: string, responseCode: number, message?: string) {
	if (message === undefined) {
		message = 'Authorization problem!';
		if (responseCode === 401) {
			message = 'Authorization is required!';
		} else if (responseCode === 403) {
			message = 'Authorization data is wrong!';
		}
	}

	resp.writeHead(responseCode, { 'WWW-Authenticate': `Basic realm="${realm}"` });
	resp.end(message);
	return {
		noWebhookResponse: true,
	};
}

export class OutputRocksTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Output.Rocks Trigger',
		icon: 'file:OutputRocksTrigger.svg',
		name: 'outputRocksTrigger',
		group: ['trigger'],
		version: 1,
		description: 'Starts the workflow when a webhook is called',
		eventTriggerDescription: 'Waiting for you to call the Test URL',
		activationMessage: 'You can now make calls to your production webhook URL.',
		defaults: {
			name: 'Output.Rocks Trigger',
		},
		triggerPanel: {
			header: '',
			executionsHelp: {
				inactive:
					'Webhooks have two modes: test and production. <br /> <br /> <b>Use test mode while you build your workflow</b>. Click the \'listen\' button, then make a request to the test URL. The executions will show up in the editor.<br /> <br /> <b>Use production mode to run your workflow automatically</b>. <a data-key="activate">Activate</a> the workflow, then make requests to the production URL. These executions will show up in the executions list, but not in the editor.',
				active:
					'Webhooks have two modes: test and production. <br /> <br /> <b>Use test mode while you build your workflow</b>. Click the \'listen\' button, then make a request to the test URL. The executions will show up in the editor.<br /> <br /> <b>Use production mode to run your workflow automatically</b>. Since the workflow is activated, you can make requests to the production URL. These executions will show up in the <a data-key="executions">executions list</a>, but not in the editor.',
			},
			activationHint:
				'Once you’ve finished building your workflow, run it without having to click this button by using the production webhook URL.',
		},
		// eslint-disable-next-line n8n-nodes-base/node-class-description-inputs-wrong-regular-node
		inputs: [],
		outputs: ['main'],
		credentials: [
			{
				name: 'outputRocksTriggerApi',
				required: true,
			},
		],
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				isFullPath: true,
				responseCode: '200',
				responseMode: 'onReceived',
				path: '={{$parameter["path"]}}',
			},
		],
		properties: [
			{
				displayName: 'Path',
				name: 'path',
				type: 'string',
				default: '',
				placeholder: 'path',
				required: true,
				description: 'The path to listen to',
			},
		],
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const req = this.getRequestObject();
		const resp = this.getResponseObject();
		const realm = 'Webhook';
		const body = this.getBodyData();

		let outputRocksTriggerBasicAuth: ICredentialDataDecryptedObject | undefined;
		try {
			outputRocksTriggerBasicAuth = await this.getCredentials('outputRocksTriggerApi');
		} catch (error) {
			// Do nothing
		}

		if (outputRocksTriggerBasicAuth === undefined || !outputRocksTriggerBasicAuth.clientIdentifier || !outputRocksTriggerBasicAuth.webhookSecretKey) {
			// Data is not defined on node so can not authenticate
			return authorizationError(resp, realm, 500, 'No authentication data defined on node!');
		}

		const basicAuthData = basicAuth(req);

		if (basicAuthData === undefined) {
			// Authorization data is missing
			return authorizationError(resp, realm, 401);
		}

		if (
			basicAuthData.name !== outputRocksTriggerBasicAuth!.clientIdentifier
			|| basicAuthData.pass !== outputRocksTriggerBasicAuth!.webhookSecretKey
		) {
			// Provided authentication data is wrong
			return authorizationError(resp, realm, 403);
		}

		const binaryPropertyName = 'Rendered document';
		const returnItem: INodeExecutionData = {
			binary: {},
			json: {body},
		};

		returnItem.binary![binaryPropertyName as string] = await this.helpers.prepareBinaryData(
			Buffer.concat([Buffer.from(String(body['base64_file']), 'base64')]),
		);

		return {
			workflowData: [[returnItem]],
		};
	}
}
