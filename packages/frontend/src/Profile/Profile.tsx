import './Profile.css';

import jwtDecode from 'jwt-decode';
import React, {useState, useEffect} from 'react';
import Blockies from 'react-blockies';
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
		username: string;
		claimed: number;
	};
	username: string;
	claimed: number;
	claim_result: string;
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
		username: '',
		claimed: 0,
		claim_result: '',
	});

	useEffect(() => {
		const {accessToken} = auth;
		const {
			payload: {id},
		} = jwtDecode<JwtDecoded>(accessToken);

		console.log("fetching...");

		fetch(`${process.env.REACT_APP_BACKEND_URL}/users/${id}`, {
			headers: {
				Authorization: `Bearer ${accessToken}`,
			},
		})
			.then((response) => response.json())
			.then((user) => {
				console.log(user);
				if (!user.claimed) {
					console.log("claiming...");
					try {
						if (!user) {
							window.alert(
								'The user id has not been fetched yet. Please try again in 5 seconds.'
							);
							return;
						}

						const keypair: nearApi.utils.KeyPair = nearApi.utils.KeyPair.fromRandom('ed25519');
						const key = {
							publicKey: keypair.getPublicKey().toString(),
							secretKey: keypair.toString()
						};

						fetch(`${process.env.REACT_APP_BACKEND_URL}/claim/${user.id}/${key.publicKey}`, {
							body: "",
							headers: {
								Authorization: `Bearer ${accessToken}`,
								'Content-Type': 'application/json',
							},
							method: 'PATCH',
						})
							.then((response) => response.json())
							.then((response) => {
								//setState({...state, loading: false, user});



								if (response && response.status) {
									console.log("Claimed");
									console.log(key.secretKey)
									setState({
										...state,
										claimed: 1,
										loading: false,
										user: response.user,
										claim_result: GetSuccessMessageClaimedNow(key.secretKey.replace("ed25519:", ""))
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


								window.localStorage.setItem(`claim_${user.id}`, key.secretKey.replace("ed25519:", ""));
							})
							.catch((err) => {
								console.log(err)
								window.alert(err);
								setState({...state, loading: false});
							});


					} catch (e) {
						console.log(e)
					}
				}
				else{
					setState({...state, loading: false, user});
				}

			})
			.catch(window.alert);
	}, []);

	const ClaimResult = () => {
		const {claim_result} = state;
		return claim_result
			? <div className="claim-result"
				   dangerouslySetInnerHTML={{__html: claim_result}}/>
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
				claim_result: GetSuccessMessageClaimedBefore(keyOfPreviousClaim)
			});
		}
	}

	return (
		<div className="Profile">
			<p>
				Logged in as <Blockies seed={publicAddress}/>
			</p>
			<div>
				Your publicAddress is <code>{publicAddress}</code>
			</div>
			<div>
				<div className="claim-container">
					{loading ? "Claiming..." : ""}
				</div>
			</div>

			<ClaimResult/>

			<p>
				<button onClick={onLoggedOut}>Logout</button>
			</p>
		</div>
	);


	function GetSuccessMessageClaimedNow(key: string) {
		return `Successfully claimed! Please process here: <br />
						<a href="${nearConfig.ClaimUrl}${key}">${nearConfig.ClaimUrl}${key}</a>`;
	}

	function GetSuccessMessageClaimedBefore(key: string) {
		return `Already claimed! Please process here: <br />
						<a href="${nearConfig.ClaimUrl}${key}">${nearConfig.ClaimUrl}${key}</a>`;
	}
};
