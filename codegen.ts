import type { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  schema: 'schemas/github-graphql.graphql',
  documents: ['src/graphql/**/*.ts'],
  generates: {
    './src/gql/': {
      plugins: [],
      preset: 'client',
      config: {
        useTypeImports: true,
        enumsAsTypes: true,
        scalars: {
          DateTime: 'string',
          URI: 'string',
          HTML: 'string',
          GitObjectID: 'string',
          Date: 'string',
          PreciseDateTime: 'string',
          X509Certificate: 'string',
          GitSSHRemote: 'string',
          GitTimestamp: 'string',
          Base64String: 'string',
          BigInt: 'string',
          CustomPropertyValue: 'string | string[]',
          SponsorsListingFeaturedItemFeatureableType: 'string',
        },
      },
    },
  },
  ignoreNoDocuments: true,
};

export default config;
