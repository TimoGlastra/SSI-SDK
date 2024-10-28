import {verifyEBSICredentialIssuer} from "../src/agent/OID4VCIHolder";
import {CredentialMapper} from "@sphereon/ssi-types";
import {IssuerType} from "../src";

const nock = require("nock")

const BASE_URL = 'https://api-conformance.ebsi.eu'
const GET_VALID_ISSUER_URI = '/trusted-issuers-registry/v4/issuers/did:ebsi:ziDnioxYYLW1a3qUbqTFz4W'
const GET_INVALID_ISSUER_URI = '/trusted-issuers-registry/v4/issuers/invalid_issuer'

describe('EBSI Functions', () => {
    describe('verifyEBSICredentialIssuer', () => {

        const validIssuerResult = {
            did: "did:ebsi:ziDnioxYYLW1a3qUbqTFz4W",
            attributes: [{
                hash: "test",
                body: "eyJ0eXAiOiJKV1QiLCJraWQiOiIxODNkY2E4NDRiNzM5OGM4MTQ0ZTJiMzk5OWM3MzA2Y2I3OTYzMDJhZWQxNDdkNjY4ZmI2ZmI5YmE0OTZkNTBkIiwiYWxnIjoiRVMyNTZLIn0.eyJpc3N1ZXIiOiJkaWQ6ZWJzaTp6aURuaW94WVlMVzFhM3FVYnFURno0VyIsImlhdCI6MTcxNDQxMzA4OCwianRpIjoidXJuOnV1aWQ6NWZiN2Q5OGItMTA4Yy00YmMwLTlmZmMtYzY5Zjg0ZWQ3ODhmIiwibmJmIjoxNzE0NDEzMDg4LCJleHAiOjE3NDU5NDkwODgsInN1YiI6ImRpZDplYnNpOnpleWJBaUp4elVVcldRMVlNNTFTWTM1IiwidmMiOnsiQGNvbnRleHQiOlsiaHR0cHM6Ly93d3cudzMub3JnLzIwMTgvY3JlZGVudGlhbHMvdjEiXSwiaWQiOiJ1cm46dXVpZDo1ZmI3ZDk4Yi0xMDhjLTRiYzAtOWZmYy1jNjlmODRlZDc4OGYiLCJ0eXBlIjpbIlZlcmlmaWFibGVDcmVkZW50aWFsIiwiVmVyaWZpYWJsZUF0dGVzdGF0aW9uIiwiVmVyaWZpYWJsZUF1dGhvcmlzYXRpb25Ub09uYm9hcmQiXSwiaXNzdWFuY2VEYXRlIjoiMjAyNC0wNC0yOVQxNzo1MToyOFoiLCJpc3N1ZWQiOiIyMDI0LTA0LTI5VDE3OjUxOjI4WiIsInZhbGlkRnJvbSI6IjIwMjQtMDQtMjlUMTc6NTE6MjhaIiwiZXhwaXJhdGlvbkRhdGUiOiIyMDI1LTA0LTI5VDE3OjUxOjI4WiIsImlzc3VlciI6ImRpZDplYnNpOnppRG5pb3hZWUxXMWEzcVVicVRGejRXIiwiY3JlZGVudGlhbFN1YmplY3QiOnsiaWQiOiJkaWQ6ZWJzaTp6ZXliQWlKeHpVVXJXUTFZTTUxU1kzNSIsImFjY3JlZGl0ZWRGb3IiOltdfSwidGVybXNPZlVzZSI6eyJpZCI6ImRpZDplYnNpOnpleWJBaUp4elVVcldRMVlNNTFTWTM1IiwidHlwZSI6Iklzc3VhbmNlQ2VydGlmaWNhdGUifSwiY3JlZGVudGlhbFNjaGVtYSI6eyJpZCI6Imh0dHBzOi8vYXBpLXBpbG90LmVic2kuZXUvdHJ1c3RlZC1zY2hlbWFzLXJlZ2lzdHJ5L3YyL3NjaGVtYXMvejNNZ1VGVWtiNzIydXE0eDNkdjV5QUptbk5tekRGZUs1VUM4eDgzUW9lTEpNIiwidHlwZSI6IkZ1bGxKc29uU2NoZW1hVmFsaWRhdG9yMjAyMSJ9fX0.QWNWTWlrbUpLcFJaLVBGczQ0U3Mxb200Mk4yb3JzWndsTXp3REpHTTMxSUM2WG5ZVXJ0ZlY4RHFTbVQtaXBIMEdLSDZhclFEcGtrbXZTTy1NenYxWEE",
                issuerType: "RootTAO",
                tao: "did:ebsi:zeybAiJxzUUrWQ1YM51SY35",
                rootTao: "did:ebsi:ziDnioxYYLW1a3qUbqTFz4W"
            }]
        }

        const notIssuerResult = {
            did: "did:ebsi:ziDnioxYYLW1a3qUbqTFz4W",
            attributes: [{
                hash: "test",
                body: "eyJ0eXAiOiJKV1QiLCJraWQiOiIxODNkY2E4NDRiNzM5OGM4MTQ0ZTJiMzk5OWM3MzA2Y2I3OTYzMDJhZWQxNDdkNjY4ZmI2ZmI5YmE0OTZkNTBkIiwiYWxnIjoiRVMyNTZLIn0.eyJpc3N1ZXIiOiJkaWQ6ZWJzaTp6aURuaW94WVlMVzFhM3FVYnFURno0VyIsImlhdCI6MTcxNDQxMzA4OCwianRpIjoidXJuOnV1aWQ6NWZiN2Q5OGItMTA4Yy00YmMwLTlmZmMtYzY5Zjg0ZWQ3ODhmIiwibmJmIjoxNzE0NDEzMDg4LCJleHAiOjE3NDU5NDkwODgsInN1YiI6ImRpZDplYnNpOnpleWJBaUp4elVVcldRMVlNNTFTWTM1IiwidmMiOnsiQGNvbnRleHQiOlsiaHR0cHM6Ly93d3cudzMub3JnLzIwMTgvY3JlZGVudGlhbHMvdjEiXSwiaWQiOiJ1cm46dXVpZDo1ZmI3ZDk4Yi0xMDhjLTRiYzAtOWZmYy1jNjlmODRlZDc4OGYiLCJ0eXBlIjpbIlZlcmlmaWFibGVDcmVkZW50aWFsIiwiVmVyaWZpYWJsZUF0dGVzdGF0aW9uIiwiVmVyaWZpYWJsZUF1dGhvcmlzYXRpb25Ub09uYm9hcmQiXSwiaXNzdWFuY2VEYXRlIjoiMjAyNC0wNC0yOVQxNzo1MToyOFoiLCJpc3N1ZWQiOiIyMDI0LTA0LTI5VDE3OjUxOjI4WiIsInZhbGlkRnJvbSI6IjIwMjQtMDQtMjlUMTc6NTE6MjhaIiwiZXhwaXJhdGlvbkRhdGUiOiIyMDI1LTA0LTI5VDE3OjUxOjI4WiIsImlzc3VlciI6ImRpZDplYnNpOnppRG5pb3hZWUxXMWEzcVVicVRGejRXIiwiY3JlZGVudGlhbFN1YmplY3QiOnsiaWQiOiJkaWQ6ZWJzaTp6ZXliQWlKeHpVVXJXUTFZTTUxU1kzNSIsImFjY3JlZGl0ZWRGb3IiOltdfSwidGVybXNPZlVzZSI6eyJpZCI6ImRpZDplYnNpOnpleWJBaUp4elVVcldRMVlNNTFTWTM1IiwidHlwZSI6Iklzc3VhbmNlQ2VydGlmaWNhdGUifSwiY3JlZGVudGlhbFNjaGVtYSI6eyJpZCI6Imh0dHBzOi8vYXBpLXBpbG90LmVic2kuZXUvdHJ1c3RlZC1zY2hlbWFzLXJlZ2lzdHJ5L3YyL3NjaGVtYXMvejNNZ1VGVWtiNzIydXE0eDNkdjV5QUptbk5tekRGZUs1VUM4eDgzUW9lTEpNIiwidHlwZSI6IkZ1bGxKc29uU2NoZW1hVmFsaWRhdG9yMjAyMSJ9fX0.QWNWTWlrbUpLcFJaLVBGczQ0U3Mxb200Mk4yb3JzWndsTXp3REpHTTMxSUM2WG5ZVXJ0ZlY4RHFTbVQtaXBIMEdLSDZhclFEcGtrbXZTTy1NenYxWEE",
                issuerType: "Revoked or Undefined",
                tao: "did:ebsi:zeybAiJxzUUrWQ1YM51SY35",
                rootTao: "did:ebsi:ziDnioxYYLW1a3qUbqTFz4W"
            }]
        }

        it(`should return the issuer's did and attributes if the issuer is valid`, async () => {
           nock(BASE_URL)
               .get(GET_VALID_ISSUER_URI)
               .reply(200, JSON.stringify(validIssuerResult))
           await expect(verifyEBSICredentialIssuer({
               wrappedVc: CredentialMapper.toWrappedVerifiableCredential("eyJ0eXAiOiJKV1QiLCJraWQiOiIxODNkY2E4NDRiNzM5OGM4MTQ0ZTJiMzk5OWM3MzA2Y2I3OTYzMDJhZWQxNDdkNjY4ZmI2ZmI5YmE0OTZkNTBkIiwiYWxnIjoiRVMyNTZLIn0.eyJpc3N1ZXIiOiJkaWQ6ZWJzaTp6aURuaW94WVlMVzFhM3FVYnFURno0VyIsImlhdCI6MTcxNDQxMzA4OCwianRpIjoidXJuOnV1aWQ6NWZiN2Q5OGItMTA4Yy00YmMwLTlmZmMtYzY5Zjg0ZWQ3ODhmIiwibmJmIjoxNzE0NDEzMDg4LCJleHAiOjE3NDU5NDkwODgsInN1YiI6ImRpZDplYnNpOnpleWJBaUp4elVVcldRMVlNNTFTWTM1IiwidmMiOnsiQGNvbnRleHQiOlsiaHR0cHM6Ly93d3cudzMub3JnLzIwMTgvY3JlZGVudGlhbHMvdjEiXSwiaWQiOiJ1cm46dXVpZDo1ZmI3ZDk4Yi0xMDhjLTRiYzAtOWZmYy1jNjlmODRlZDc4OGYiLCJ0eXBlIjpbIlZlcmlmaWFibGVDcmVkZW50aWFsIiwiVmVyaWZpYWJsZUF0dGVzdGF0aW9uIiwiVmVyaWZpYWJsZUF1dGhvcmlzYXRpb25Ub09uYm9hcmQiXSwiaXNzdWFuY2VEYXRlIjoiMjAyNC0wNC0yOVQxNzo1MToyOFoiLCJpc3N1ZWQiOiIyMDI0LTA0LTI5VDE3OjUxOjI4WiIsInZhbGlkRnJvbSI6IjIwMjQtMDQtMjlUMTc6NTE6MjhaIiwiZXhwaXJhdGlvbkRhdGUiOiIyMDI1LTA0LTI5VDE3OjUxOjI4WiIsImlzc3VlciI6ImRpZDplYnNpOnppRG5pb3hZWUxXMWEzcVVicVRGejRXIiwiY3JlZGVudGlhbFN1YmplY3QiOnsiaWQiOiJkaWQ6ZWJzaTp6ZXliQWlKeHpVVXJXUTFZTTUxU1kzNSIsImFjY3JlZGl0ZWRGb3IiOltdfSwidGVybXNPZlVzZSI6eyJpZCI6ImRpZDplYnNpOnpleWJBaUp4elVVcldRMVlNNTFTWTM1IiwidHlwZSI6Iklzc3VhbmNlQ2VydGlmaWNhdGUifSwiY3JlZGVudGlhbFNjaGVtYSI6eyJpZCI6Imh0dHBzOi8vYXBpLXBpbG90LmVic2kuZXUvdHJ1c3RlZC1zY2hlbWFzLXJlZ2lzdHJ5L3YyL3NjaGVtYXMvejNNZ1VGVWtiNzIydXE0eDNkdjV5QUptbk5tekRGZUs1VUM4eDgzUW9lTEpNIiwidHlwZSI6IkZ1bGxKc29uU2NoZW1hVmFsaWRhdG9yMjAyMSJ9fX0.QWNWTWlrbUpLcFJaLVBGczQ0U3Mxb200Mk4yb3JzWndsTXp3REpHTTMxSUM2WG5ZVXJ0ZlY4RHFTbVQtaXBIMEdLSDZhclFEcGtrbXZTTy1NenYxWEE"),
               issuerType: ['RootTAO']
           })).resolves.toEqual(validIssuerResult)
        })

        it(`should throw an Error if the issuer type is not RootTAO, TAO or TI`, async () => {
            const issuerType: IssuerType[] = ['RootTAO', 'TAO', 'TI']
            nock(BASE_URL)
                .get(GET_VALID_ISSUER_URI)
                .reply(200, JSON.stringify(notIssuerResult))
            await expect(verifyEBSICredentialIssuer({
                wrappedVc: CredentialMapper.toWrappedVerifiableCredential("eyJ0eXAiOiJKV1QiLCJraWQiOiIxODNkY2E4NDRiNzM5OGM4MTQ0ZTJiMzk5OWM3MzA2Y2I3OTYzMDJhZWQxNDdkNjY4ZmI2ZmI5YmE0OTZkNTBkIiwiYWxnIjoiRVMyNTZLIn0.eyJpc3N1ZXIiOiJkaWQ6ZWJzaTp6aURuaW94WVlMVzFhM3FVYnFURno0VyIsImlhdCI6MTcxNDQxMzA4OCwianRpIjoidXJuOnV1aWQ6NWZiN2Q5OGItMTA4Yy00YmMwLTlmZmMtYzY5Zjg0ZWQ3ODhmIiwibmJmIjoxNzE0NDEzMDg4LCJleHAiOjE3NDU5NDkwODgsInN1YiI6ImRpZDplYnNpOnpleWJBaUp4elVVcldRMVlNNTFTWTM1IiwidmMiOnsiQGNvbnRleHQiOlsiaHR0cHM6Ly93d3cudzMub3JnLzIwMTgvY3JlZGVudGlhbHMvdjEiXSwiaWQiOiJ1cm46dXVpZDo1ZmI3ZDk4Yi0xMDhjLTRiYzAtOWZmYy1jNjlmODRlZDc4OGYiLCJ0eXBlIjpbIlZlcmlmaWFibGVDcmVkZW50aWFsIiwiVmVyaWZpYWJsZUF0dGVzdGF0aW9uIiwiVmVyaWZpYWJsZUF1dGhvcmlzYXRpb25Ub09uYm9hcmQiXSwiaXNzdWFuY2VEYXRlIjoiMjAyNC0wNC0yOVQxNzo1MToyOFoiLCJpc3N1ZWQiOiIyMDI0LTA0LTI5VDE3OjUxOjI4WiIsInZhbGlkRnJvbSI6IjIwMjQtMDQtMjlUMTc6NTE6MjhaIiwiZXhwaXJhdGlvbkRhdGUiOiIyMDI1LTA0LTI5VDE3OjUxOjI4WiIsImlzc3VlciI6ImRpZDplYnNpOnppRG5pb3hZWUxXMWEzcVVicVRGejRXIiwiY3JlZGVudGlhbFN1YmplY3QiOnsiaWQiOiJkaWQ6ZWJzaTp6ZXliQWlKeHpVVXJXUTFZTTUxU1kzNSIsImFjY3JlZGl0ZWRGb3IiOltdfSwidGVybXNPZlVzZSI6eyJpZCI6ImRpZDplYnNpOnpleWJBaUp4elVVcldRMVlNNTFTWTM1IiwidHlwZSI6Iklzc3VhbmNlQ2VydGlmaWNhdGUifSwiY3JlZGVudGlhbFNjaGVtYSI6eyJpZCI6Imh0dHBzOi8vYXBpLXBpbG90LmVic2kuZXUvdHJ1c3RlZC1zY2hlbWFzLXJlZ2lzdHJ5L3YyL3NjaGVtYXMvejNNZ1VGVWtiNzIydXE0eDNkdjV5QUptbk5tekRGZUs1VUM4eDgzUW9lTEpNIiwidHlwZSI6IkZ1bGxKc29uU2NoZW1hVmFsaWRhdG9yMjAyMSJ9fX0.QWNWTWlrbUpLcFJaLVBGczQ0U3Mxb200Mk4yb3JzWndsTXp3REpHTTMxSUM2WG5ZVXJ0ZlY4RHFTbVQtaXBIMEdLSDZhclFEcGtrbXZTTy1NenYxWEE"),
                issuerType: issuerType
            })).rejects.toThrowError(Error(`The issuer type is required to be one of: ${issuerType.join(', ')}`))
        })

        it(`should throw an Error if the issuer's did is not provided`, async () => {
            await expect(verifyEBSICredentialIssuer({
                wrappedVc: CredentialMapper.toWrappedVerifiableCredential("eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IjE4M2RjYTg0NGI3Mzk4YzgxNDRlMmIzOTk5YzczMDZjYjc5NjMwMmFlZDE0N2Q2NjhmYjZmYjliYTQ5NmQ1MGQifQ.eyJpc3N1ZXIiOiJkaWQ6ZWJzaTp6aURuaW94WVlMVzFhM3FVYnFURno0VyIsImlhdCI6MTcxNDQxMzA4OCwianRpIjoidXJuOnV1aWQ6NWZiN2Q5OGItMTA4Yy00YmMwLTlmZmMtYzY5Zjg0ZWQ3ODhmIiwibmJmIjoxNzE0NDEzMDg4LCJleHAiOjE3NDU5NDkwODgsInN1YiI6ImRpZDplYnNpOnpleWJBaUp4elVVcldRMVlNNTFTWTM1IiwidmMiOnsiQGNvbnRleHQiOlsiaHR0cHM6Ly93d3cudzMub3JnLzIwMTgvY3JlZGVudGlhbHMvdjEiXSwiaWQiOiJ1cm46dXVpZDo1ZmI3ZDk4Yi0xMDhjLTRiYzAtOWZmYy1jNjlmODRlZDc4OGYiLCJ0eXBlIjpbIlZlcmlmaWFibGVDcmVkZW50aWFsIiwiVmVyaWZpYWJsZUF0dGVzdGF0aW9uIiwiVmVyaWZpYWJsZUF1dGhvcmlzYXRpb25Ub09uYm9hcmQiXSwiaXNzdWFuY2VEYXRlIjoiMjAyNC0wNC0yOVQxNzo1MToyOFoiLCJpc3N1ZWQiOiIyMDI0LTA0LTI5VDE3OjUxOjI4WiIsInZhbGlkRnJvbSI6IjIwMjQtMDQtMjlUMTc6NTE6MjhaIiwiZXhwaXJhdGlvbkRhdGUiOiIyMDI1LTA0LTI5VDE3OjUxOjI4WiIsImlzc3VlciI6IiIsImNyZWRlbnRpYWxTdWJqZWN0Ijp7ImlkIjoiZGlkOmVic2k6emV5YkFpSnh6VVVyV1ExWU01MVNZMzUiLCJhY2NyZWRpdGVkRm9yIjpbXX0sInRlcm1zT2ZVc2UiOnsiaWQiOiJkaWQ6ZWJzaTp6ZXliQWlKeHpVVXJXUTFZTTUxU1kzNSIsInR5cGUiOiJJc3N1YW5jZUNlcnRpZmljYXRlIn0sImNyZWRlbnRpYWxTY2hlbWEiOnsiaWQiOiJodHRwczovL2FwaS1waWxvdC5lYnNpLmV1L3RydXN0ZWQtc2NoZW1hcy1yZWdpc3RyeS92Mi9zY2hlbWFzL3ozTWdVRlVrYjcyMnVxNHgzZHY1eUFKbW5ObXpERmVLNVVDOHg4M1FvZUxKTSIsInR5cGUiOiJGdWxsSnNvblNjaGVtYVZhbGlkYXRvcjIwMjEifX19.OFcZ-7iqoP_LmxTWqM9rR4aOK8VPyKyRJ2R8MD6m1jT2LzyqMVKzX__EF6e0ghs73l-nVtJBIu28QFsMFxAODg")
            })).rejects.toThrowError(Error("The issuer of the VC is required to be present"))
        })

        it(`should throw an Error if the issuer's did is invalid`, async () => {
            nock(BASE_URL).get(GET_INVALID_ISSUER_URI).reply(400)
            await expect(verifyEBSICredentialIssuer({
                wrappedVc: CredentialMapper.toWrappedVerifiableCredential("eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IjE4M2RjYTg0NGI3Mzk4YzgxNDRlMmIzOTk5YzczMDZjYjc5NjMwMmFlZDE0N2Q2NjhmYjZmYjliYTQ5NmQ1MGQifQ.eyJpc3N1ZXIiOiJkaWQ6ZWJzaTp6aURuaW94WVlMVzFhM3FVYnFURno0VyIsImlhdCI6MTcxNDQxMzA4OCwianRpIjoidXJuOnV1aWQ6NWZiN2Q5OGItMTA4Yy00YmMwLTlmZmMtYzY5Zjg0ZWQ3ODhmIiwibmJmIjoxNzE0NDEzMDg4LCJleHAiOjE3NDU5NDkwODgsInN1YiI6ImRpZDplYnNpOnpleWJBaUp4elVVcldRMVlNNTFTWTM1IiwidmMiOnsiQGNvbnRleHQiOlsiaHR0cHM6Ly93d3cudzMub3JnLzIwMTgvY3JlZGVudGlhbHMvdjEiXSwiaWQiOiJ1cm46dXVpZDo1ZmI3ZDk4Yi0xMDhjLTRiYzAtOWZmYy1jNjlmODRlZDc4OGYiLCJ0eXBlIjpbIlZlcmlmaWFibGVDcmVkZW50aWFsIiwiVmVyaWZpYWJsZUF0dGVzdGF0aW9uIiwiVmVyaWZpYWJsZUF1dGhvcmlzYXRpb25Ub09uYm9hcmQiXSwiaXNzdWFuY2VEYXRlIjoiMjAyNC0wNC0yOVQxNzo1MToyOFoiLCJpc3N1ZWQiOiIyMDI0LTA0LTI5VDE3OjUxOjI4WiIsInZhbGlkRnJvbSI6IjIwMjQtMDQtMjlUMTc6NTE6MjhaIiwiZXhwaXJhdGlvbkRhdGUiOiIyMDI1LTA0LTI5VDE3OjUxOjI4WiIsImlzc3VlciI6ImludmFsaWRfaXNzdWVyIiwiY3JlZGVudGlhbFN1YmplY3QiOnsiaWQiOiJkaWQ6ZWJzaTp6ZXliQWlKeHpVVXJXUTFZTTUxU1kzNSIsImFjY3JlZGl0ZWRGb3IiOltdfSwidGVybXNPZlVzZSI6eyJpZCI6ImRpZDplYnNpOnpleWJBaUp4elVVcldRMVlNNTFTWTM1IiwidHlwZSI6Iklzc3VhbmNlQ2VydGlmaWNhdGUifSwiY3JlZGVudGlhbFNjaGVtYSI6eyJpZCI6Imh0dHBzOi8vYXBpLXBpbG90LmVic2kuZXUvdHJ1c3RlZC1zY2hlbWFzLXJlZ2lzdHJ5L3YyL3NjaGVtYXMvejNNZ1VGVWtiNzIydXE0eDNkdjV5QUptbk5tekRGZUs1VUM4eDgzUW9lTEpNIiwidHlwZSI6IkZ1bGxKc29uU2NoZW1hVmFsaWRhdG9yMjAyMSJ9fX0.r0kAeMRrwn8lQNJakAmfWRtLmRQdRbULNjbbvTPsirpVGmN5O0V9O7eQ7_S4sHTF8p_AShSanv4MLvtRfCvg1A")
            })).rejects.toThrowError('The issuer of the VC cannot be trusted')
        })
    })
})
