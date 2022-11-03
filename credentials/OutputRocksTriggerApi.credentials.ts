import {ICredentialType, INodeProperties} from 'n8n-workflow';

export class OutputRocksTriggerApi implements ICredentialType {
	name = 'outputRocksTriggerApi';
	displayName = 'Output.Rocks API';
	documentationUrl = 'https://docs.n8n.io/integrations/creating-nodes/build/declarative-style-node/';
	properties: INodeProperties[] = [
		{
			displayName: 'User (client identifier 1)',
			name: 'clientIdentifier',
			type: 'string',
			default: '',
		},
		{
			displayName: 'Password (webhook secret key 2)',
			name: 'webhookSecretKey',
			type: 'string',
			typeOptions: {minValue: 32},
			default: '',
		},
	];
}
