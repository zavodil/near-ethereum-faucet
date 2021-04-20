import './App.css';
import React, {useEffect, useState} from 'react';

import {Login} from '../Login';
import {Profile} from '../Profile/Profile';
import {Auth} from '../types';

const LS_KEY = 'login-with-metamask:auth';

interface State {
	auth?: Auth;
}

function getPreviousClaimCount() {
	return Object.keys(window.localStorage)
		.filter((key) => key.startsWith("claim_")).length
}

export const App = (): JSX.Element => {
	const [state, setState] = useState<State>({});

	useEffect(() => {
		const urlParams = new URLSearchParams(window.location.search);
		const invite = urlParams.get('invite')
		if (invite) {
			if (getPreviousClaimCount() < 1)
				window.localStorage.setItem(`invite`, invite);
			else
				window.localStorage.removeItem(`invite`);

			window.location.href = window.location.origin + window.location.pathname;
			return;
		}

		// Access token is stored in localstorage
		const ls = window.localStorage.getItem(LS_KEY);
		const auth = ls && JSON.parse(ls);
		setState({auth});
	}, []);

	const handleLoggedIn = (auth: Auth) => {
		localStorage.setItem(LS_KEY, JSON.stringify(auth));
		setState({auth});
	};

	const handleLoggedOut = () => {
		localStorage.removeItem(LS_KEY);
		setState({auth: undefined});
	};

	const {auth} = state;

	return (
		auth ? (
			<Profile auth={auth} onLoggedOut={handleLoggedOut}/>
		) : (
			<Login onLoggedIn={handleLoggedIn}/>
		)
	);
};
