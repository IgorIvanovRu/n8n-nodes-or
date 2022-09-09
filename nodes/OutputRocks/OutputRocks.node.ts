import {INodeExecutionData, INodeType, INodeTypeDescription, NodeOperationError, IWebhookResponseData,} from 'n8n-workflow';
import {IExecuteFunctions, IWebhookFunctions, WAIT_TIME_UNLIMITED} from "n8n-core";
import {OptionsWithUri} from "request-promise-native";

export class OutputRocks implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'OutputRocks',
		name: 'OutputRocks',
		icon: 'file:outputrocks.svg',
		group: ['transform'],
		version: 1,
		subtitle: 'rendering template',
		description: 'Generating template document',
		defaults: {
			name: 'OutputRocks',
			color: '#3b4151',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'OutputRocksApi',
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
				displayName: 'Format',
				name: 'format',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'PDF',
						value: 'pdf',
					},
					{
						name: 'TXT',
						value: 'txt',
					},
					{
						name: 'HTML',
						value: 'html',
					},
				],
				default: 'pdf',
				description: 'Document format',
			},
			{
				displayName: 'Webhook Identifier',
				name: 'webhook',
				type: 'string',
				required: false,
				default: '',
				placeholder: 'n8n-webhook',
				description: 'The Webhook of the document',
			},
			{
				displayName: 'Template identifier',
				name: 'template',
				type: 'string',
				required: true,
				default: '',
				placeholder: 'sample',
				description: 'The identifier of the template',
			},
			{
				displayName: 'Metadata',
				name: 'metadata',
				type: 'string',
				required: false,
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
				displayName: 'Webhook waiting URL',
				name: 'webhookWaitingUrl',
				type: 'hidden',
				required: false,
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

				const jsonBody: { [key: string]: any } = {
					"template": template,
					"format": format,
					"data": JSON.parse(data),
					"metadata": {
						"webhookWaitingUrl": webhookWaitingUrl,
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
					uri: `https://app.staging.output.rocks/api/renderings`,
					json: true,
				};

				responseData = await this.helpers.requestWithAuthentication.call(this, 'OutputRocksApi', options);
				returnData.push(responseData);
				item = items[itemIndex];
				item.json = responseData;

				let waitTill = new Date(WAIT_TIME_UNLIMITED);
				waitTill = new Date(new Date().getTime() + 60);

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
