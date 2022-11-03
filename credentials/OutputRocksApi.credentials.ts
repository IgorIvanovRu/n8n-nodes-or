import {
	ICredentialDataDecryptedObject,
	ICredentialType, IHttpRequestOptions,
	INodeProperties,
} from 'n8n-workflow';

export class OutputRocksApi implements ICredentialType {
	name = 'outputRocksApi';
	displayName = 'Output.Rocks API';
	documentationUrl = 'https://docs.n8n.io/integrations/creating-nodes/build/declarative-style-node/';
	properties: INodeProperties[] = [
		{
			displayName: 'API Token',
			name: 'apiToken',
			type: 'string',
			default: '',
		},
	];

	async authenticate(
		credentials: ICredentialDataDecryptedObject,
		requestOptions: IHttpRequestOptions,
	): Promise<IHttpRequestOptions> {
		requestOptions.headers = { 'X-AUTH-TOKEN': credentials.apiToken };
		return requestOptions;
	}
}
