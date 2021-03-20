import './Login.css';

import React, {useState} from 'react';
import Web3 from 'web3';
import {nearConfig} from "../nearconfig";

import {Auth} from '../types';

interface Props {
	onLoggedIn: (auth: Auth) => void;
}

let web3: Web3 | undefined = undefined; // Will hold the web3 instance

export const Login = ({onLoggedIn}: Props): JSX.Element => {
	const [loading, setLoading] = useState(false); // Loading button state

	const handleAuthenticate = ({
									publicAddress,
									signature,
								}: {
		publicAddress: string;
		signature: string;
	}) =>
		fetch(`${process.env.REACT_APP_BACKEND_URL}/auth`, {
			body: JSON.stringify({publicAddress, signature}),
			headers: {
				'Content-Type': 'application/json',
			},
			method: 'POST',
		}).then((response) => response.json());

	const handleSignMessage = async ({
										 publicAddress,
										 nonce,
									 }: {
		publicAddress: string;
		nonce: string;
	}) => {
		try {
			const signature = await web3!.eth.personal.sign(
				`I am signing my one-time nonce: ${nonce}`,
				publicAddress,
				'' // MetaMask will ignore the password argument here
			);

			return {publicAddress, signature};
		} catch (err) {
			throw new Error(
				'You need to sign the message to be able to log in.'
			);
		}
	};

	const handleSignup = (publicAddress: string) =>
		fetch(`${process.env.REACT_APP_BACKEND_URL}/users`, {
			body: JSON.stringify({publicAddress}),
			headers: {
				'Content-Type': 'application/json',
			},
			method: 'POST',
		}).then((response) => response.json());

	const handleClick = async () => {
		// Check if MetaMask is installed
		if (!(window as any).ethereum) {
			window.alert('Please install MetaMask first.');
			return;
		}

		if (!web3) {
			try {
				// Request account access if needed
				await (window as any).ethereum.enable();

				// We don't know window.web3 version, so we use our own instance of Web3
				// with the injected provider given by MetaMask
				web3 = new Web3((window as any).ethereum);
			} catch (error) {
				window.alert('You need to allow MetaMask.');
				return;
			}
		}

		const coinbase = await web3.eth.getCoinbase();
		if (!coinbase) {
			window.alert('Please activate MetaMask first.');
			return;
		}

		const is_mainnet = await web3.eth.net.getId().then(netId => {
			return (netId === 1)
		});

		if (!is_mainnet) {
			alert("Only Mainnet Wallets available");
			return false;
		}

		const publicAddress = coinbase.toLowerCase();

		web3.eth.getBalance(publicAddress).then(balance => {
			console.log("Balance: " + balance);
			if (Number(balance) < nearConfig.MinAmountEth) {
				alert('Not enough balance to proceed.')
				return;
			} else {
				setLoading(true);

				// Look if user with current publicAddress is already present on backend
				fetch(
					`${process.env.REACT_APP_BACKEND_URL}/users?publicAddress=${publicAddress}`
				)
					.then((response) => response.json())
					// If yes, retrieve it. If no, create it.
					.then((users) =>
						users.length ? users[0] : handleSignup(publicAddress)
					)
					// Popup MetaMask confirmation modal to sign message
					.then(handleSignMessage)
					// Send signature to backend on the /auth route
					.then(handleAuthenticate)
					// Pass accessToken back to parent component (to save it in localStorage)
					.then(onLoggedIn)
					.catch((err) => {
						window.alert(err);
						setLoading(false);
					});
			}
		});
	};

	return (
		<div className="App landing">
			<nav data-behavior="topbar" className="topbar profile-header"
				 onClick={() => window.location.href = nearConfig.BridgeUrl}>
				<div className="logo"/>
				<div className="rainbow-bridge">
					NEAR Rainbow Bridge
				</div>
			</nav>

			<header className="App-header">
				<h1 className="App-title">
					NEAR Faucet for Ethereum Holders
				</h1>
			</header>
			<div className="App-intro">
				<div className="login">
					<h1>Claim your <br/> NEAR account</h1>
					<p>
						Create <strong>free</strong> NEAR account by showing
						that you have at least {nearConfig.MinAmountEthText}.
					</p>
					<button className="action-button cta" onClick={handleClick}>
						{loading ? 'Loading...' : 'Login with MetaMask'}
					</button>
				</div>
			</div>
		</div>
	);
};
