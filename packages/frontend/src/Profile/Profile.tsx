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
		loading: false,
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

		fetch(`${process.env.REACT_APP_BACKEND_URL}/users/${id}`, {
			headers: {
				Authorization: `Bearer ${accessToken}`,
			},
		})
			.then((response) => response.json())
			.then((user) => {
				console.log(user);
				setState({...state, user});
			})
			.catch(window.alert);
	}, []);

	const handleClaim = () => {
		try {
			const {accessToken} = auth;
			const {user, username} = state;

			setState({...state, loading: true});

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
				body: JSON.stringify({username}),
				headers: {
					Authorization: `Bearer ${accessToken}`,
					'Content-Type': 'application/json',
				},
				method: 'PATCH',
			})
				.then((response) => response.json())
				.then((response) => {
					//setState({...state, loading: false, user});

					setState({
						...state, loading: false, user: response.user
					});

					if (response) {
						if (response.status) {
							console.log("Claimed");
							console.log(key.secretKey)
							setState({
								...state,
								claimed: 1,
								claim_result: GetSuccessMessageClaimedNow(key.secretKey)
							});
						} else {
							alert(response.text)
						}
					}


					window.localStorage.setItem(`claim_${user.id}`, key.secretKey);
				})
				.catch((err) => {
					console.log(err)
					window.alert(err);
					setState({...state, loading: false});
				});


		} catch (e) {
			console.log(e)
		}
	};

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

	const claimed = user && !!user.claimed;
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
					<button disabled={loading || claimed} onClick={handleClaim}>
						{claimed ? "Already claimed" : "Claim NEAR account"}
					</button>
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
						<a href="${nearConfig.ClaimUrl}/${key}">https://redpacket.near.org/${key}</a>`;
	}

	function GetSuccessMessageClaimedBefore(key: string) {
		return `Already claimed! Please process here: <br />
						<a href="${nearConfig.ClaimUrl}/${key}">https://redpacket.near.org/${key}</a>`;
	}
};
