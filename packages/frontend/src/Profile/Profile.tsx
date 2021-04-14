import './Profile.css';

import jwtDecode from 'jwt-decode';
import React, {useState, useEffect} from 'react';
import * as nearApi from 'near-api-js'
import {nearConfig} from "../nearconfig";

import {Auth} from '../types';

interface Props {
	auth: Auth;
	onLoggedOut: () => void;
}

interface State {
	loading: boolean;
	user?: {
		id: number;
		nearPublicKey: string;
		claimed: number;
		totalAffiliates: number;
	};
	claim_result: string;
	claim_result_key: string;
	ref_claim_available: number;
	ref_claim_result: string;
	last_tx: string;
	ref_block_visible: boolean;
}

interface JwtDecoded {
	payload: {
		id: string;
		publicAddress: string;
	};
}

export const Profile = ({auth, onLoggedOut}: Props): JSX.Element => {
	const [state, setState] = useState<State>({
		loading: true,
		user: undefined,
		claim_result: '',
		claim_result_key: '',
		ref_claim_available: 0,
		ref_claim_result: '',
		last_tx: '',
		ref_block_visible: false,
	});

	useEffect(() => {
		(async () => {
			const {accessToken} = auth;
			const {
				payload: {id},
			} = jwtDecode<JwtDecoded>(accessToken);

			console.log("fetching...");
			const handleErrors = (response: any) => {
				if (!response.ok) throw new Error(response.status);
				return response;
			};

			await fetch(`${process.env.REACT_APP_BACKEND_URL}/users/${id}`, {
				headers: {
					Authorization: `Bearer ${accessToken}`,
				},
			})
			// handle network err/success
				.then(handleErrors)
				.then((response) => response.json())
				.then(async (user) => {
					if (user && !user.claimed) {
						console.log("claiming...");
						try {
							const keypair: nearApi.utils.KeyPair = nearApi.utils.KeyPair.fromRandom('ed25519');
							const key = {
								publicKey: keypair.getPublicKey().toString(),
								secretKey: keypair.toString()
							};
							const claim_result_key = key.secretKey.replace("ed25519:", "");

							let invite = Number(window.localStorage.getItem("invite"));

							if (user.id === invite) {
								invite = 0;
								window.localStorage.removeItem(`invite`);
							}

							await fetch(`${process.env.REACT_APP_BACKEND_URL}/claim/${user.id}/${key.publicKey}/${invite}`, {
								body: "",
								headers: {
									Authorization: `Bearer ${accessToken}`,
									'Content-Type': 'application/json',
								},
								method: 'PATCH',
							})
								.then((response) => response.json())
								.then(async (response) => {
									if (response && response.status) {
										const new_user = response.user;
										const ref_claim_available: number = new_user.totalAffiliates - new_user.claimedAffiliates;
										new_user.claimed = 1;

										const ref_block_visible = !!((await GetRefContainerVisibility(new_user.id)).account_id);

										setState({
											...state,
											loading: false,
											user: new_user,
											claim_result: GetSuccessMessageClaimedNow(),
											claim_result_key: claim_result_key,
											ref_block_visible,
											ref_claim_available
										});
									} else {
										if (response.status)
											alert(response.text)

										setState({
											...state,
											loading: false,
											user: response.user
										});
									}
									window.localStorage.setItem(`claim_${user.id}`, claim_result_key);
									window.localStorage.removeItem(`invite`);
								})
								.catch((err) => {
									console.log(err)
									window.alert(err);
									setState({...state, loading: false});
								});


						} catch (e) {
							console.log(e)
						}
					} else {
						const ref_claim_available: number = user.totalAffiliates - user.claimedAffiliates;
						const claimedUser = await GetRefContainerVisibility(user.id);
						const ref_block_visible = !!claimedUser.account_id;
						const claim_result_message = ref_block_visible ? GetSuccessMessageClaimed(claimedUser.account_id) : GetSuccessMessageClaimedButNotFinished();
						setState({
							...state,
							loading: false,
							user,
							claim_result: claim_result_message,
							ref_claim_available,
							ref_block_visible
						});
					}
				})
				.catch(window.alert);
		})();
	}, []);

	const GetRefContainerVisibility = async (userId: number) => {
		return await fetch(`${process.env.REACT_APP_BACKEND_URL}/claim/${userId}/refLinkAvailability`, {
			headers: {
				Authorization: `Bearer ${accessToken}`,
				'Content-Type': 'application/json',
			},
			method: 'GET'
		}).then((response) => response.json())
	}

	const RefLink = () => {
		const {user} = state;

		if (user) {
			const link = getRefLink(user.id);
			return <div className="ref-link">You invitation link: <a
				href={link}>{link}</a></div>
		} else {
			return null
		}
	};

	const RefClaimButton = () => {
		const {user, ref_claim_available} = state;

		if (ref_claim_available) {
			const reward = ref_claim_available * nearConfig.AffiliateRewardNear;
			return <button
				className="action-button cta"
				type="button"
				disabled={loading}
				onClick={async () => {
					await ClaimAffiliateRewards();
				}}
			>Claim rewards: {reward} NEAR</button>
		} else if (user && user.totalAffiliates) {
			return <div className="already-invited">Already invited
				users: {user.totalAffiliates}</div>
		} else
			return null;
	}

	const RefContainer = () => {
		const {ref_block_visible} = state;
		return ref_block_visible
			? <div className="ref-container">
				<RefLink/>

				<RefClaimButton/>
				<RefClaimResult/>
			</div>
			: null;
	};


	const LastTxLink = () => {
		const {last_tx} = state;

		return last_tx ? <div><a
			href={`https://explorer.testnet.near.org/transactions/${last_tx}`}>Check
			tx</a></div> : null;
	}

	const RefClaimResult = () => {
		const {ref_claim_result} = state;

		return loading
			? <div>Claiming...</div>
			: ref_claim_result
				? <div
					className="ref-claim-result">{ref_claim_result}<LastTxLink/>
				</div>
				: null
	}

	const ClaimAffiliateRewards = async () => {
		const {user} = state;

		if (user) {
			setState({
				...state,
				loading: true
			});

			await fetch(`${process.env.REACT_APP_BACKEND_URL}/claim/${user.id}/reward`, {
				headers: {
					Authorization: `Bearer ${accessToken}`,
					'Content-Type': 'application/json',
				},
				method: 'GET'
			}).then((response) => response.json())
				.then((response) => {
					if (response.status) {
						const ref_claim_available: number = response.user.totalAffiliates - response.user.claimedAffiliates;
						setState({
							...state,
							loading: false,
							ref_claim_result: response.text,
							last_tx: response.tx,
							ref_claim_available
						});
					}
				}).catch(() => {
					setState({
						...state,
						loading: false
					});
				});
		}
	};

	const ClaimResult = () => {
		const {claim_result, ref_block_visible} = state;

		const claimButton = !ref_block_visible ? <GetClaimButton/> : null;

		return claim_result
			? <div className="claim-result">
				{claim_result}
				{claimButton}
			</div>
			: null;
	};

	const {accessToken} = auth;

	const {
		payload: {publicAddress},
	} = jwtDecode<JwtDecoded>(accessToken);

	const {loading, user, claim_result, ref_block_visible} = state;

	const userId = user && user.id;

	if (userId) {
		const keyOfPreviousClaim = window.localStorage.getItem(`claim_${userId}`);
		if (keyOfPreviousClaim && !claim_result) {
			setState({
				...state,
				claim_result: GetSuccessMessageClaimedButNotFinished()
			});
		}
	}

	return (
		<div className="App landing">
			<nav data-behavior="topbar" className="topbar profile-header">
				<div className="profile-nav"
					 onClick={() => window.location.href = nearConfig.BridgeUrl}>
					<div className="logo"/>
					<div className="rainbow-bridge">
						NEAR Rainbow Bridge
					</div>
				</div>
				<div className="logout">
					<button onClick={onLoggedOut}>Logout</button>
				</div>
			</nav>

			<header className="App-header">
				<h1 className="App-title">
					NEAR Faucet for Ethereum Holders
				</h1>
			</header>
			<div className="App-intro">
				<div className="Profile">
					<div>
						<div className="claim-container">
							{loading ? "Claiming..." : ""}
						</div>
					</div>

					<ClaimResult/>

					{!ref_block_visible ?
						<div className="account-info">
							<div>Your Ethereum Address:</div>
							<code>{publicAddress}</code>
						</div>
						: null
					}

					<RefContainer/>
				</div>
			</div>
		</div>
	);

	function GetClaimButton() {
		let {claim_result_key} = state;

		if (!claim_result_key)
			claim_result_key = window.localStorage.getItem(`claim_${userId}`) || "";

		return claim_result_key
			? <button
				className="action-button cta"
				type="button"
				onClick={(e) => {
					e.preventDefault();
					window.location.href = `${nearConfig.ClaimUrl}${claim_result_key.replace("ed25519:", "")}`;
				}}
			>Create Account</button>
			: <div className="key-not-found">
				Key not found in the localstorage. <br/>Did you claim it in the
				different browser?
			</div>;
	}

	function getRefLink(id: number): string {
		return `${location.protocol}//${location.host}/?invite=${id.toString()}`;
	}

	function GetSuccessMessageClaimedNow() {
		return `Next, create an account in the NEAR Wallet:`;
	}

	function GetSuccessMessageClaimed(account_id: string) {
		return `Already claimed account ${account_id}!`;
	}

	function GetSuccessMessageClaimedButNotFinished() {
		return `Already claimed! Continue below:`;
	}
};
