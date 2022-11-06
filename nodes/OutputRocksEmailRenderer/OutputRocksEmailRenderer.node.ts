import {INodeExecutionData, INodeType, INodeTypeDescription, IWebhookResponseData, NodeOperationError,} from 'n8n-workflow';
import {IExecuteFunctions, IWebhookFunctions, WAIT_TIME_UNLIMITED} from "n8n-core";
import {OptionsWithUri} from "request-promise-native";

export class OutputRocksEmailRenderer implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Output.Rocks Email Renderer',
		name: 'OutputRocksEmailRenderer',
		icon: 'file:OutputRocksEmailRenderer.svg',
		group: ['transform'],
		version: 1,
		description: 'Generating email document',
		defaults: {
			name: 'Output.Rocks Email Renderer',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'outputRocksApi',
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
				path: '',
				restartWebhook: true,
			},
		],
		properties: [
			{
				displayName: 'Webhook Identifier',
				name: 'webhook',
				type: 'string',
				default: '',
				placeholder: 'n8n-webhook',
				description: 'The Webhook of the document',
			},
			{
				displayName: 'Email Template Identifier',
				name: 'email_template',
				type: 'string',
				required: true,
				default: '',
				placeholder: 'my-email',
				description: 'The identifier of the email template',
			},
			{
				displayName: 'Email Server Identifier',
				name: 'email_server',
				type: 'string',
				required: true,
				default: '',
				placeholder: 'server-identifier',
			},
			{
				displayName: 'Metadata',
				name: 'metadata',
				type: 'string',
				default: '',
				placeholder: 'metadata',
				description: 'Metadata description',
			},
			{
				displayName: 'Data',
				name: 'data',
				type: 'string',
				required: true,
				default: '',
				placeholder: 'data',
				description: 'Data description',
			},
			{
				displayName: 'Webhook Waiting URL',
				name: 'webhookWaitingUrl',
				type: 'hidden',
				default: '={{$resumeWebhookUrl}}',
			},
		],
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const headers = this.getHeaderData();
		const response: INodeExecutionData = {
			json: {
				headers,
				params: this.getParamsData(),
				query: this.getQueryData(),
				body: this.getBodyData(),
			},
		};

		return {
			workflowData: [[response]],
		};
	}

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		let responseData;
		const returnData = [];
		let item: INodeExecutionData;

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			try {
				const format = this.getNodeParameter('format', itemIndex) as string;
				const webhook = this.getNodeParameter('webhook', itemIndex) as string;
				const template = this.getNodeParameter('template', itemIndex) as string;
				const metadata = this.getNodeParameter('metadata', itemIndex) as string;
				const data = this.getNodeParameter('data', itemIndex) as string;
				const webhookWaitingUrl = this.getNodeParameter('webhookWaitingUrl', itemIndex) as string;

				// tslint:disable-next-line:no-any
				const jsonBody: { [key: string]: any } = {
					"template": template,
					"format": format,
					"data": JSON.parse(data),
					"metadata": {
						"webhookWaitingUrl": 'http://ec2-3-122-97-149.eu-central-1.compute.amazonaws.com:5678/webhook-waiting/'
							+ webhookWaitingUrl.split('/').pop(),
					},
				};

				if (metadata) {
					jsonBody["metadata"] = Object.assign(jsonBody["metadata"], JSON.parse(metadata));
				}

				if (webhook) {
					jsonBody["webhook"] = webhook;
				}

				const options: OptionsWithUri = {
					headers: {
						'Accept': 'application/json',
						'Content-Type': 'application/json',
					},
					method: 'POST',
					body: jsonBody,
					uri: `https://app.output.rocks/api/renderings`,
					json: true,
				};

				responseData = await this.helpers.requestWithAuthentication.call(this, 'outputRocksApi', options);
				returnData.push(responseData);
				item = items[itemIndex];
				item.json = responseData;

				let waitTill = new Date(WAIT_TIME_UNLIMITED);
				waitTill = new Date(new Date().getTime() + 120);

				await this.putExecutionToWait(waitTill);

				return [this.getInputData()];
			} catch (error) {
				// This node should never fail but we want to showcase how
				// to handle errors.
				if (this.continueOnFail()) {
					items.push({ json: this.getInputData(itemIndex)[0].json, error, pairedItem: itemIndex });
				} else {
					// Adding `itemIndex` allows other workflows to handle this error
					if (error.context) {
						// If the error thrown already contains the context property,
						// only append the itemIndex
						error.context.itemIndex = itemIndex;
						throw error;
					}
					throw new NodeOperationError(this.getNode(), error, {
						itemIndex,
					});
				}
			}
		}

		return this.prepareOutputData(items);
	}
}
