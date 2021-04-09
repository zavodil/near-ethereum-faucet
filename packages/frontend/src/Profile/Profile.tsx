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
	};
	claim_result: string;
	claim_result_key: string;
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
					console.log(user);
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
								.then((response) => {
									if (response && response.status) {
										const new_user = response.user;
										new_user.claimed = 1;
										setState({
											...state,
											loading: false,
											user: new_user,
											claim_result: GetSuccessMessageClaimedNow(),
											claim_result_key: claim_result_key
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
								/*.then((response) => {
									console.log(response);

									fetch(`${process.env.REACT_APP_BACKEND_URL}/claim/refLink/${user.id}`, {
										body: "",
										headers: {
											Authorization: `Bearer ${accessToken}`,
											'Content-Type': 'application/json',
										},
										method: 'PATCH'
									}).then((response) => response.json())
										.then((response) => {
											console.log(response);
										});

								})*/
								.catch((err) => {
									console.log(err)
									window.alert(err);
									setState({...state, loading: false});
								});


						} catch (e) {
							console.log(e)
						}
					} else {
						setState({
							...state,
							loading: false,
							user,
							claim_result: GetSuccessMessageClaimedBefore()
						});
					}


					await fetch(`${process.env.REACT_APP_BACKEND_URL}/claim/${user.id}/refLink`, {
						headers: {
							Authorization: `Bearer ${accessToken}`,
							'Content-Type': 'application/json',
						},
						method: 'GET'
					}).then((response) => response.json())
						.then((response) => {
							console.log(response);
						});

					await fetch(`${process.env.REACT_APP_BACKEND_URL}/claim/${user.id}/refInfo`, {
						headers: {
							Authorization: `Bearer ${accessToken}`,
							'Content-Type': 'application/json',
						},
						method: 'GET'
					}).then((response) => response.json())
						.then((response) => {
							console.log("refInfo");
							console.log(response);
						});

				})
				.catch(window.alert);
		})();
	}, []);

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

	const ClaimResult = () => {
		const {claim_result} = state;

		return claim_result
			? <div className="claim-result">
				{claim_result}
				<GetClaimButton/>
			</div>
			: null;
	};

	const {accessToken} = auth;

	const {
		payload: {publicAddress},
	} = jwtDecode<JwtDecoded>(accessToken);

	const {loading, user, claim_result} = state;

	const userId = user && user.id;

	if (userId) {
		const keyOfPreviousClaim = window.localStorage.getItem(`claim_${userId}`);
		if (keyOfPreviousClaim && !claim_result) {
			setState({
				...state,
				claim_result: GetSuccessMessageClaimedBefore()
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

					<div className="account-info">
						<div>Your Ethereum Address:</div>
						<code>{publicAddress}</code>
					</div>

					<div>
						<RefLink/>
					</div>
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

	function GetSuccessMessageClaimedBefore() {
		return `Already claimed! Continue below:`;
	}
};
