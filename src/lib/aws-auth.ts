import 'server-only';
import {
  CognitoIdentityProviderClient,
  ConfirmSignUpCommand,
  InitiateAuthCommand,
  SignUpCommand,
} from '@aws-sdk/client-cognito-identity-provider';

function cognitoConfig() {
  const region = process.env.AWS_REGION;
  const clientId = process.env.AWS_COGNITO_CLIENT_ID;

  if (!region || !clientId) {
    throw new Error('AWS_REGION and AWS_COGNITO_CLIENT_ID are required for Amazon Cognito authentication.');
  }

  return { region, clientId };
}

function cognitoClient() {
  return new CognitoIdentityProviderClient({ region: cognitoConfig().region });
}

export async function signUpWithCognito(input: {
  email: string;
  password: string;
  name?: string;
}) {
  const { clientId } = cognitoConfig();
  const response = await cognitoClient().send(new SignUpCommand({
    ClientId: clientId,
    Username: input.email,
    Password: input.password,
    UserAttributes: [
      { Name: 'email', Value: input.email },
      ...(input.name ? [{ Name: 'name', Value: input.name }] : []),
    ],
  }));

  return response;
}

export async function confirmCognitoSignUp(input: {
  email: string;
  code: string;
}) {
  const { clientId } = cognitoConfig();
  return cognitoClient().send(new ConfirmSignUpCommand({
    ClientId: clientId,
    Username: input.email,
    ConfirmationCode: input.code,
  }));
}

export async function signInWithCognito(input: {
  email: string;
  password: string;
}) {
  const { clientId } = cognitoConfig();
  return cognitoClient().send(new InitiateAuthCommand({
    ClientId: clientId,
    AuthFlow: 'USER_PASSWORD_AUTH',
    AuthParameters: {
      USERNAME: input.email,
      PASSWORD: input.password,
    },
  }));
}
