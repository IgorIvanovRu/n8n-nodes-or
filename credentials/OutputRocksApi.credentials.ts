import {
	IAuthenticateGeneric,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class OutputRocksApi implements ICredentialType {
	name = 'OutputRocksApi';
	displayName = 'OutputRocks API';
	documentationUrl = 'https://docs.n8n.io/integrations/creating-nodes/build/declarative-style-node/';
	properties: INodeProperties[] = [
		{
			displayName: 'API Token',
			name: 'apiToken',
			type: 'string',
			default: '',
		},
	];

	authenticate = {
		type: 'generic',
		properties: {
			headers: {
				'X-AUTH-TOKEN': '={{$credentials.apiToken}}',
			},
		},
	} as IAuthenticateGeneric;
}
