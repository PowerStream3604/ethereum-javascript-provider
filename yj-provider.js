console.log('ttb-provider included');

'use strict';

if ("undefined" == typeof ttb)
{
	console.log('in "undefined" == typeof ttb');
	var ttb = {};

	ttb.getDeviceOS = function()
	{
		if (!window.hasOwnProperty('__deviceOS'))
		{
			if (window.hasOwnProperty('android') && window.android.hasOwnProperty('callback')) ttb.__deviceOS = 'android';
			else if (window.hasOwnProperty('webkit') && window.webkit.hasOwnProperty('messageHandlers')) ttb.__deviceOS = 'ios';
			else if (window.hasOwnProperty('flutter_inappwebview')) ttb.__deviceOS = 'flutter';
			else ttb.__deviceOS = 'plain';
		}
		return ttb.__deviceOS;
	};

	ttb.call_webview_object = function(param)
	{
		let deviceOS = ttb.getDeviceOS();

		console.log('call_webview_object', deviceOS);

		if ('android' == deviceOS)
		{
			return window.android.callback(JSON.stringify(param));
		}
		else if ('ios' == deviceOS)
		{
			return window.webkit.messageHandlers.callback.postMessage(JSON.stringify(param));
		}
		else if ('flutter' == deviceOS)
		{
			return window.flutter_inappwebview.callHandler('ttbActionRequest', JSON.stringify(param));
		}
		else /* PC */
		{
			if (param.hasOwnProperty('onCallback') && window.hasOwnProperty(param.onCallback))
			{
				return window[param.onCallback](param);
			}
			else if (param.hasOwnProperty('pc_result'))
			{
				return param.pc_result;
			}
		}
	};

	ttb.is_object = (v) => typeof v === "object" && v !== null;
	ttb.is_string = (v) => typeof v === 'string' || v instanceof String;
	ttb.is_function = (v) => typeof v === 'function';
	ttb.is_array = (v) => Array.isArray(v);
	ttb.is_null = (v) => v === null;

	ttb.os = ttb.getDeviceOS();

	ttb.active_chain_id = '0x3';
	ttb.web3_singleton = (function()
	{
		var instance;
		var web3;
		if (ttb.active_chain_id == '0x3')
		{
			web3 = new Web3('https://ropsten.infura.io/v3/c989902496c04964bd09cd2db5fd7279');
			console.log('ropsten');
		}
		else
			web3 = new Web3('https://mainnet.infura.io/v3/c989902496c04964bd09cd2db5fd7279');

		function initiate()
		{
			return web3;
		}
		return {
			getInstance: function()
			{
				if (!instance)
				{
					instance = initiate();
				}
				return instance;
			}
		}
	})();

	ttb.provider = ttb.web3_singleton.getInstance().currentProvider;
	ttb.web3 = ttb.web3_singleton.getInstance();
	ttb.web3_provider = ttb.web3_singleton.getInstance();
	/*console.log('currentProvider', ttb.web3.currentProvider);*/
	ttb.event = {};

	ttb.connected_chain_id = {};
	ttb.active_chain_id = null;

	ttb.message_handler = {};
	ttb.provider.networkVersion = null;
	ttb.provider.selectedAddress = null;
	/*
	By DApp - consumer(dapp)에서 이벤트 등록 할때
	window.ethereum.on('disconnect', err => {err.code, err.message.....});
	*/
	ttb.provider.on = (name, callback_func) =>
	{
		/* bucket_handler registered_handlers 객체에 push
		disconnect, connect, account.... */

		ttb.message_handler[name] = callback_func;
	};

	/*
		이 메소드는 end-point에서 이벤트 발생시 호출
	*/
	ttb.event.notify = (name, param) =>
	{
		console.log(`ttb.event.notify() called with name: ${name}`);
		console.dir(param);

		/*
		End-point 호출: ttb.event.notify('connect', {'chainId': nnn })
		*/
		if ('connect' == name)
		{
			ttb.connected_chain_id[param.chainId] = param.chainId;

			ttb.active_chain_id = param.chainId;
			/* Legacy 지원 */
			ttb.provider.chainId = param.chainId;

			if (ttb.message_handler[name])
			{
				ttb.message_handler[name](param);
			}
		}

		/*
		End-point 호출: ttb.event.notify('disconnect', {'chainId': nnn })
		*/
		if ('disconnect' == name)
		{
			if (ttb.connected_chain_id.hasOwnProperty(param.chainId))
			{
				delete ttb.connected_chain_id[param.chainId];

				ttb.active_chain_id = null;
				/* Legacy 지원 */
				ttb.provider.chainId = null;
			}

			if (0 == Object.keys(ttb.connected_chain_id).length)
			{
				/* 모든 연결이 끊겼을때만 dapp에 알려야함 */
				let err = new Error('disconnect');
				err.code = 4900;

				if (ttb.message_handler[name]) ttb.message_handler[name](err);

				/* ******************* Legacy Events support ******************************* */
				if (ttb.message_handler['close']) ttb.message_handler['close'](err);
			}
		}

		/*
		End-point 호출: ttb.event.notify('accountsChanged', {'accounts': string[] })
		*/
		if ('accountsChanged' == name)
		{
			if (param.hasOwnProperty('accounts') && ttb.is_array(param.accounts))
			{
				if (ttb.message_handler[name]) ttb.message_handler[name](param.accounts);
			}
			else
			{
				console.log('accountsChanged param missing');
				throw new Error('accountsChanged param missing');
			}
		}

		/*
		End-point 호출: ttb.event.notify('chainChanged', {'chainId': nnn })
		*/
		if ('chainChanged' == name)
		{
			if (param.hasOwnProperty('chainId'))
			{
				ttb.active_chain_id = param.chainId;
				/* Legacy 지원 */
				ttb.provider.chainId = param.chainId;

				if (ttb.message_handler[name]) ttb.message_handler[name](ttb.active_chain_id);

				/* ******************* Legacy Events support ******************************* */
				if (ttb.message_handler['chainIdChanged']) ttb.message_handler['chainIdChanged'](err);
				if (ttb.message_handler['networkChanged']) ttb.message_handler['networkChanged'](err);
			}
			else 
			{
				console.log('chainChanged param missing');
				throw new Error('chainChanged param missing');
			}
		}
	}


		ttb.active_chain_id = '0x3';

			/* ttb.active_chain_id = await ttb.provider.request({method: 'eth_chainId'}); */

		switch (ttb.active_chain_id)
		{
			/* singleton으로 변경 필요 */
			case '0x3':
			{
				ttb.web3 = new Web3(new Web3.providers.HttpProvider('https://ropsten.infura.io/v3/c989902496c04964bd09cd2db5fd7279'));
				ttb.web3_provider = new Web3(new Web3.providers.HttpProvider('https://ropsten.infura.io/v3/c989902496c04964bd09cd2db5fd7279'));
					break;
			}
			default:
			{
				/* default mainnet */
				ttb.web3 = new Web3(new Web3.providers.HttpProvider('https://mainnet.infura.io/v3/c989902496c04964bd09cd2db5fd7279'));
				ttb.web3_provider = new Web3(new Web3.providers.HttpProvider('https://mainnet.infura.io/v3/c989902496c04964bd09cd2db5fd7279'));
			}
		}
			/* 아래에서 web3.currentProvider.send()함수를 사용해야함, 하지만 현재 ttb.provider.send가 이를 override하고 있음 */
			/*ttb.web3_provider = ttb.web3;*/

			/*ttb.provider = ttb.web3.currentProvider;*/

			/*
				이 메소드는 end-point에서 이벤트 발생시 호출
			*/

			/* Promise를 리턴해야 하며, consumer(dapp)에서 rpc 요청을 대신한다. */
	ttb.provider.request = (payload) =>
	{
		console.log('call ttb.provider.request');
		console.dir(payload);
		let promise = new Promise(async (resolve_func, reject_func) =>
		{
			if (!payload.hasOwnProperty('params')) payload.params = {};
			let bundle = {
				'actionType': 'walletProvider',
				'action': payload.method,
				'params': payload.params
			};

			if (['eth_requestAccounts', 'eth_accounts'].includes(payload.method))
			{
				bundle.pc_result = '{"code": 200, "message": "OK", "body" :{"accounts": ["0x4c10D2734Fb76D3236E522509181CC3Ba8DE0e80", "0x5C252a0c0475f9711b56ab160a1999729eccCE97"] }}';
			}
			if (['eth_chainId'].includes(payload.method))
			{
				bundle.pc_result = '{"code": 200, "message": "OK", "body" :{"chainId": "0x3" }}';
			}
			let result_json_string = await ttb.call_webview_object(bundle);
			console.log('type of return value from webview 123123');

			console.log(result_json_string);
			let oJson = JSON.parse(result_json_string);
			console.log('parsing done');
			/* 성공시 code 를 200 이전에 사용하던 방식에 따라 */
			if (200 == oJson.code)
			{
				let data = oJson.body;
				switch (payload.method)
				{
					case 'eth_gasPrice':
					{
						console.log('eth_gasPrice working');
						console.log(data.price);
						resolve_func(data.price);
						break;
					}
					case 'eth_requestAccounts':
					{
						console.log('eth_requestAccounts working');
						resolve_func(data.accounts);
						break;
					}
					case 'eth_accounts':
					{
						console.log('eth_accounts working');
						resolve_func(data.accounts);
						break;
					}
					case 'eth_sendTransaction':
					{
						console.log('eth_sendTransaction working');
						resolve_func(data.trans_hash);
						break;
					}
					case 'net_version':
					{
						console.log('net_version workings');
						resolve_func(data.networkId);
						break;
					}
					case 'eth_chainId':
					{
						console.log('eth_chainId');
						resolve_func(data.chainId);
						break;
					}
					case 'eth_getBlockByNumber':
					{
						console.log('eth_getBlockByNumber');
						/*  */
						resolve_func(data.info);
						break;
					}
					case 'eth_blockNumber':
					{
						console.log('eth_blockNumber');
						resolve_func(data.blockNum)
					}
					case 'eth_subscribe':
					{
						console.log('eth_subscribe');
						/* 보류 */
						resolve_func(data);
						break;
					}
					case 'wallet_requestPermissions':
					{
						console.log('wallet_requestPermissions');
						/* 보류 */
					resolve_func(data);
						break;
					}
					default:
						resolve_func(data);
				}
			}
			else
			{
				if (4001 == oJson.code)
				{
					oJson.message = "User Rejected the Request";
				}
				if (4200 == oJson.code)
				{
					oJson.message = "Unsupported method";
					}
				if (999 == oJson.code)
				{
					oJson.message = "Unexpected Error while executing";
				}
				let err = new ProviderRpcError(oJson.message);
				err.code = oJson.code;
				console.dir(oJson);
				if ('function' == typeof reject_func) reject_func(err);
				else throw err;
			}
		});
		return promise;
	};

	class ProviderRpcError extends Error
	{
		constructor(...params)
		{
			super(...params);
				this.code = -1;
			this.data = null;
		}
	}
		class ProviderMessage
	{
		constructor(type, data)
		{
			this._type = type;
			this._data = data;
		}
			get type()
		{
			return this._type;
		}
			get data()
		{
			return this._data;
		}
	}
	/* 나중에 다시 검토 */
	class EthSubscription extends ProviderMessage
	{
		constructor(type, data)
		{
			super('eth_subscription', data);
		}
	}
		ttb.provider.isMetaMask = true;
	window.ethereum = ttb.provider;
	window.ethereum.event = ttb.event;
	/* ******************* Experimental API ******************************* */
		/* ttb지갑의 경우는 무조건 unlocked 상태에서만 dapp 브라우저를 이용할수 있슴 */
	ttb.provider._metamask = {};
	ttb.provider._metamask.isUnlocked = async () => await true;
		/* ******************* Legacy DEPRECATED Properties support ******************************* */
		/* ttb.active_chain_id 와 같음 */
	ttb.provider.chainId = ttb.active_chain_id;
	/*ttb.provider getnetworkVersion
	ttb.provider.networkVersion = get () { await ttb.provider.request({method: 'net_version'})};
	ttb.provider.selectedAddress = get () => await ttb.provider.request({method: 'eth_accounts'});*/
		/* ******************* Legacy DEPRECATED method support ******************************* */
	ttb.provider.enable = async () =>
	{
		/*
		legacy API를 이용하는 dapp은 항상 이 메소드를 먼저 호출 할 것이기에
		필요한 properties를 여기서 호출 설정해 놓아야함
		*/
		console.log('123 before request');
		let accounts = await ttb.provider.request({ method: 'eth_requestAccounts' });
		console.log('00000 before accounts');
		ttb.provider.selectedAddress = await ttb.provider.request({ method: 'eth_accounts' });
		ttb.provider.networkVersion = await ttb.provider.request({ method: 'net_version' });
		return accounts;
	};
		ttb.provider.isConnected = () => !ttb.is_null(ttb.active_chain_id);
		/* Alias request */
	ttb.provider.sendAsync = (payload, callback) =>
	{
		ttb.provider.request(payload).then(callback);
	};
		/* 3가지 호출 방법 처리 */
	ttb.provider.send = async function(...params)
	{
		console.log('in send');
		console.dir(params[0]);
		let support_flag = 0;
		if (ttb.is_string(params[0]) || ttb.is_object(params[0]))
		{
			let method = null;
			if (ttb.is_string(params[0]))
			{
				method = params[0];
			}
			else
			{
				method = params[0].method;
			}
			let sign_needed_method = [
				'eth_requestAccounts',
				'eth_sendTransaction',
				'eth_signTransaction',
				'eth_sendRawTransaction',
				'eth_accounts',
				'eth_chainId',
				'net_version',
				'eth_sign',
				'eth_gasPrice'
			];
			if (sign_needed_method.includes(method))
			{
				support_flag = 1;
			}
		}
		if (params.length > 1 && ttb.is_object(params[0]) && ttb.is_function(params[1]))
		{
			/* void */
			console.log('1');
			if (1 == support_flag)
				ttb.provider.request(params[0]).then(params[1]);
			else
			{
				console.log('inside else statement');
				params[0].jsonrpc = '2.0';
				params[0].id = '1';
				console.log('provider', ttb.web3_provider.currentProvider);
				console.log('payload', params);
				/* 이 부분에서 override 되서 오 작동 ttb.web3.currentProvider.send(params[0]).then(params[1]);*/
				ttb.web3_provider.currentProvider.send(params[0], params[1]);
			}
		}
		else if (params.length > 0 && ttb.is_string(params[0]))
		{
			if (1 == params.length) params[1] = {};
				/* return Promise<JsonRpcResponse> */
			return ttb.provider.request({ method: params[0], params: params[1] });
		}
		else if (params.length > 0 && ttb.is_object(params[0]))
		{
			console.log('3');
			/* return unknown */
			return ttb.provider.request(params[0]);
		}
	};
		console.log('provider injected');
	}
