import {recoverPersonalSignature} from 'eth-sig-util';
import {bufferToHex} from 'ethereumjs-util';
import {NextFunction, Request, Response} from 'express';
import jwt from 'jsonwebtoken';
import Web3 from 'web3';
import * as nearAPI from 'near-api-js';
import {nearConfig} from "../../nearconfig";

const {Client} = require('pg');

import {config} from '../../config';
import {User} from '../../models/user.model';

const BN = require('bn.js');

export const getRefInfo = async (req: Request, res: Response) => {
	if ((req as any).user.payload.id !== +req.params.userId) {
		return res
			.status(401)
			.send({error: 'You can can only access yourself'});
	}
	User.findByPk(req.params.userId)
		.then(async (user: User | null) => {
			if (!user)
				res.json(null);

			res.json(user)
		});
};

function ConvertToYoctoNear(amount: number) {
	return new BN(Math.round(amount * 100000000)).mul(new BN("10000000000000000")).toString();
}

export const claimAffiliateReward = async (req: Request, res: Response) => {
	if ((req as any).user.payload.id !== +req.params.userId) {
		return res
			.status(401)
			.send({error: 'You can can only access yourself'});
	}
	User.findByPk(req.params.userId)
		.then(async (user: User | null) => {
			if (user && !user.nearPublicKey)
				res.json(null);

			else if (user) {
				await getNearAccountByPublicKey(user.nearPublicKey)
					.then(async (account_id) => {
						if (account_id) {
							const totalAffiliates = user?.totalAffiliates || 0;
							const claimedAffiliates = user?.claimedAffiliates || 0;
							const amount = (totalAffiliates - claimedAffiliates) * nearConfig.AffiliateRewardNear;
							if (amount > 0) {
								const account = await GetNearMasterAccount();

								const transferTx = await account.sendMoney(
									account_id,
									ConvertToYoctoNear(amount));

								if (!transferTx.status.hasOwnProperty("SuccessValue")) {
									return res.json({
										status: false,
										text: "Because of some reason transaction was not applied as expected"
									});
								} else {
									user.claimedAffiliates = totalAffiliates;
									user.save();

									return res.json({
										status: true,
										text: "Rewards successfully claimed!",
										tx: transferTx.transaction.hash,
										user: user
									});

								}
							} else {
								return res.json({
									status: false,
									text: "Nothing to withdraw"
								});
							}
						} else {
							return res.json({
								status: false,
								text: "Unknown NEAR account"
							});
						}
					})
			}
		});
};

export const getRefLinkAvailability = async (req: Request, res: Response) => {
	if ((req as any).user.payload.id !== +req.params.userId) {
		return res
			.status(401)
			.send({error: 'You can can only access yourself'});
	}
	User.findByPk(req.params.userId)
		.then(async (user: User | null) => {
			if (user && !user.nearPublicKey)
				res.json(null);

			else if (user) {
				await getNearAccountByPublicKey(user.nearPublicKey)
					.then(account_id => res.json({
							account_id: account_id
						})
					)
			}
		});
};

async function getNearAccountByPublicKey(key: string | undefined): Promise<string> {
	if (!key)
		return "";

	let response;
	const connectionString = nearConfig.PostgresConnectionLink;
	const generatorAccount = nearConfig.GeneratorAccount;

	const client = new Client({
		connectionString,
	});

	client.connect();

	let query = `
	with delete_key_transaction as (
    select 
        originated_from_transaction_hash 
            from access_keys
            join receipts on access_keys.deleted_by_receipt_id = receipts.receipt_id
                where public_key = $1
) 
select 
    receiver_account_id 
        from  delete_key_transaction
        join receipts using(originated_from_transaction_hash)
            where receiver_account_id != $2
	`;

	try {

		response = await client.query(query, [key, generatorAccount]);
		return response.rows[0]["receiver_account_id"];
	} catch (error) {
		return "";
	}
}

function AddAffiliateSale(affiliateUserId: number) {
	return User.findByPk(affiliateUserId)
		.then((user: User | null) => {
			if (!!user) {
				const affiliates = user.totalAffiliates || 0;
				user.totalAffiliates = affiliates + 1;
				user.save();
			}
		})
}

async function GetNearMasterAccount() {
	const keyStore = new nearAPI.keyStores.UnencryptedFileSystemKeyStore(nearConfig.KeyStore);
	const near = await nearAPI.connect({
		deps: {
			keyStore,
		},
		nodeUrl: nearConfig.JsonRpc,
		networkId: nearConfig.Network,
	});

	return await near.account(nearConfig.Account)
}

export const patch = (req: Request, res: Response, next: NextFunction) => {
	// Only allow to fetch current user
	if ((req as any).user.payload.id !== +req.params.userId) {
		return res
			.status(401)
			.send({error: 'You can can only access yourself'});
	}
	return User.findByPk(req.params.userId)
		.then((user: User | null) => {
			if (user) {

				if (user.claimed) {
					res.send({
						status: false, text: `Already claimed`,
					});
					return null;
				}

				if (user.nearPublicKey) {
					res.send({
						status: false,
						text: `Public Key already exists`,
					});
					return null;
				}

				const web3 = new Web3(new Web3.providers.HttpProvider(`https://mainnet.infura.io/v3/${nearConfig.InfuraKey}`))

				return web3.eth.getBalance(user.publicAddress, async function (err, result) {
						if (err) {
							res.status(401).send({
								error: `Error with Ethereum Balance request`,
							});
							return null;
						} else {

							if (Number(result) < nearConfig.MinAmount) {
								res.send({
									status: false,
									text: `Ethereum balance is too small ${result}`,
								});
							} else {
								const account = await GetNearMasterAccount();

								user.nearPublicKey = req.params.publicKey;
								user.save();

								const transferTx = await account.functionCall(
									nearConfig.LinkDropContract,
									"send",
									{
										public_key: req.params.publicKey,
									},
									new BN("3" + "0".repeat(14)), // Maximum gas limit
									new BN(nearConfig.NearTokensToAttach),
								);

								const refUserId = Number(req.params.refUserId);
								if (refUserId) {
									AddAffiliateSale(refUserId);
									user.refUserId = refUserId;
								}

								if (!transferTx.status.hasOwnProperty("SuccessValue")) {
									return res.json({
										status: false,
										text: "Because of some reason transaction was not applied as expected"
									});
								} else {
									user.claimed = 1;
									user.save();

									return res.json({
										status: true,
										text: "Linkdrop purchase succeeded!",
										tx: transferTx.transaction.hash,
										user: user
									});

								}
							}
						}
					}
				)


			} else {
				res.status(401).send({
					error: `User with publicAddress ${req.params.userId} is not found in database`,
				});
			}

		})
		.catch(next);
};
