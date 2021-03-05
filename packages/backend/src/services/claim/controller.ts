import {recoverPersonalSignature} from 'eth-sig-util';
import {bufferToHex} from 'ethereumjs-util';
import {NextFunction, Request, Response} from 'express';
import jwt from 'jsonwebtoken';
import Web3 from 'web3';
import * as nearAPI from 'near-api-js';
import {nearConfig} from "../../nearconfig";

import {config} from '../../config';
import {User} from '../../models/user.model';

const BN = require('bn.js');

export const patch = (req: Request, res: Response, next: NextFunction) => {
	// Only allow to fetch current user
	if ((req as any).user.payload.id !== +req.params.userId) {
		return res
			.status(401)
			.send({error: 'You can can only access yourself'});
	}
	return User.findByPk(req.params.userId)
		.then((user: User | null) => {
			if (!user) {
				return user;
			}

			Object.assign(user, req.body);
			return user.save();
		})
		.then((user: User | null) => {
			if (user) {

				if (user.claimed) {
					res.send({
						status: false, text: `Already claimed`,
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

								const keyStore = new nearAPI.keyStores.UnencryptedFileSystemKeyStore(nearConfig.KeyStore);
								const near = await nearAPI.connect({
									deps: {
										keyStore,
									},
									nodeUrl: nearConfig.JsonRpc,
									networkId: nearConfig.Network,
								});

								const account = await near.account(nearConfig.Account);

								const transferTx = await account.functionCall(
									nearConfig.LinkDropContract,
									"send",
									{
										public_key: req.params.publicKey,
									},
									new BN("3" + "0".repeat(14)), // Maximum gas limit
									new BN(nearConfig.NearTokensToAttach),
								);

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
