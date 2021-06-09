'use strict';

if ("undefined" == typeof ttb)
{
	var ttb = {};

	ttb.getDeviceOS = function()
	{
		if (!window.hasOwnProperty('__deviceOS'))
		{
			if (window.hasOwnProperty('flutter_inappwebview')) ttb.__deviceOS = 'flutter';
			else ttb.__deviceOS = 'plain';
		}
		return ttb.__deviceOS;
	};

	ttb.call_webview_object = function(param)
	{
		let deviceOS = ttb.getDeviceOS();

		if ('flutter' == deviceOS)
		{
			return window.flutter_inappwebview.callHandler('ttbActionRequest', JSON.stringify(param));
		}
		else /* PC */
		{
			if (param.hasOwnProperty('onCallback') && window.hasOwnProperty(param.onCallback))
			{
				return window[param.onCallback](param);
			}
		}
	};

	ttb.is_object = (v) => typeof v === "object" && v !== null;
	ttb.is_string = (v) => typeof v === 'string' || v instanceof String;
	ttb.is_function = (v) => typeof v === 'function';
	ttb.is_array = (v) => Array.isArray(v);
	ttb.is_null = (v) => v === null;

	ttb.os = ttb.getDeviceOS();

	ttb.active_chain_id = '0x1';

	/*  fake 용 */
	class HttpProvider
	{
		get hasSubscriptions (){return false;}
		connect (){}
		disconnect (){}
		isConnected (){return true;}
		subscribe (type, method, ...params){throw new Error('Unimplemented');}
		unsubscribe (type, method, id){throw new Error('Unimplemented');}
		clone () {throw new Error('Unimplemented');}
	}
	ttb.provider = new HttpProvider();

	ttb.event = {};

	ttb.connected_chain_id = {};

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
		/*
		End-point 호출: ttb.event.notify('connect', {'chainId': nnn })
		*/
		if ('connect' == name)
		{
			ttb.connected_chain_id[param.chainId] = param.chainId;

			ttb.active_chain_id = param.chainId;
			/* Legacy 지원 */
			ttb.provider.chainId = param.chainId;

			if (ttb.message_handler[name]) ttb.message_handler[name](param);

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
				console.log('accountsChanged param missing');
				throw new Error('accountsChanged param missing');
			}
		}
	}

	ttb.return_RPCerror_message = (num) =>
	{
		if(4001 == num)
			return "User Rejected the Request";
		if(4200 == num)
			return 'Unsupported method';
		if(999 == num)
			return "Unexpected Error while executing";
		if (-32603) return "";
		if(null == num)
			return "Cannot connect to Endpoint(wallet)";
	}

	/* Promise를 리턴해야 하며, consumer(dapp)에서 rpc 요청을 대신한다. */
	ttb.provider.request = (payload) =>
	{
		let promise = new Promise(async (resolve_func, reject_func) =>
		{
			if (!payload.hasOwnProperty('params')) payload.params = [];
			if (!payload.hasOwnProperty('method')) return;
			let bundle = {
				'actionType': 'walletProvider',
				'action': payload.method,
				'params': payload.params
			};
			let result_json_string = await ttb.call_webview_object(bundle);
			try
			{
				var oJson = JSON.parse(result_json_string);
			}
			catch(error)
			{
				let err = new ProviderRpcError(ttb.return_RPCerror_message());
				err.code = -32603;
				throw err;
			}
			/* 성공시 code 를 200 이전에 사용하던 방식에 따라 */
			if (200 == oJson.code)
			{
				let data = oJson.body;
				resolve_func(data.result);
			}
			else
			{
				oJson.message = ttb.return_RPCerror_message(oJson.code);
				let err = new ProviderRpcError(oJson.message);
				err.code = oJson.code;
				/* should throw error and return error object */
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

	ttb.provider.isMetaMask = true;/* true */
	window.ethereum = ttb.provider;
	window.ethereum.event = ttb.event;
	window.web3 = {__isMetaMaskShim__ : true};
	window.web3.currentProvider = ttb.provider;
	/* ******************* Experimental API ******************************* */

	/* ttb지갑의 경우는 무조건 unlocked 상태에서만 dapp 브라우저를 이용할수 있슴 */
	ttb.provider._metamask = {};
	ttb.provider._metamask.isUnlocked = async () => await true;

	/* ******************* Legacy DEPRECATED Properties support ******************************* */

	/* ttb.active_chain_id 와 같음 */
	ttb.provider.chainId = ttb.active_chain_id;

	/* ttb.provider getnetworkVersion */
	ttb.provider.networkVersion = '1';
	ttb.provider.selectedAddress = null;

	/* ******************* Legacy DEPRECATED method support ******************************* */
	ttb.provider.enable = async () =>
	{
		/*
		legacy API를 이용하는 dapp은 항상 이 메소드를 먼저 호출 할 것이기에
		필요한 properties를 여기서 호출 설정해 놓아야함
		*/
		let accounts = await ttb.provider.request({ method: 'eth_requestAccounts' });
		ttb.provider.selectedAddress = await ttb.provider.request({ method: 'eth_accounts' });
		ttb.provider.networkVersion = await ttb.provider.request({ method: 'net_version' });
		/* 처음 연결시 notify가 발생한다면 아래 2라인 불필요 */
		ttb.active_chain_id = await ttb.provider.request({ method: 'eth_chainId' });
		ttb.provider.chainId = ttb.active_chain_id;
		return accounts;
	};

	ttb.provider.isConnected = () => !ttb.is_null(ttb.active_chain_id);

	/* Alias request */
	ttb.provider.sendAsync = async (...params) =>
	{
		/* payload가 object가 아닐 경우 처리하지 않는다. */
		if (!ttb.is_object(params[0]))
		{
			let err = new ProviderRpcError(`Cannot create property 'jsonrpc' on ${typeof payload} '${payload}'`);
			throw err;
		}
		let bundle = {'actionType':'walletProvider'};
		(params[0]?.params) ? bundle.params = params[0].params : bundle.params = [];
		if(params[0]?.method) bundle.action = params[0].method;
		console.log(params[0].method);
		let oJson = JSON.parse(await ttb.call_webview_object(bundle));
		if(ttb.is_function(params[1])){
			if(oJson.code == 200)
			{
				params[1](null, oJson.body);
			}
			else
			{
				oJson.message = ttb.return_RPCerror_message(oJson.code);
				let err = new ProviderRpcError(oJson.message);
				err.code = oJson.code;
				throw err;
			}
		}
		else
			return;
	};

	/* 3가지 호출 방법 처리 async*/
	ttb.provider.send = async function(...params)
	{
		let bundle = {'actionType':'walletProvider'};
		let hasCallback = 0;
		if (params.length > 1 && ttb.is_object(params[0]) && ttb.is_function(params[1]))
		{
			/* void */
			/* params 필수적? */
			if(params[0]?.method)
			{
				bundle.action = params[0].method;
				hasCallback = 1;
			}
		}
		else if (params.length > 0 && ttb.is_string(params[0]))
		{
			if(ttb.is_function(params[1])) throw Error('The Maroo Ethereum provider does not support synchronous methods without a callback parameter');
			/* return Promise<JsonRpcResponse> */
			bundle.action = params[0];
			if(ttb.is_array(params[1])) bundle.params = params[1];
		}
		else if (params.length > 0 && ttb.is_object(params[0]))
		{
			/* return unknown */
			if(params[0]?.method) bundle.action = params[0].method;
		}

		(params[0]?.params && bundle?.params) ? bundle.params = params[0].params : bundle.params = [];

		let oJson = JSON.parse(await ttb.call_webview_object(bundle));
		/*oJson = oJson.body;*/
		/* error속성을 가지고 있을 건지 아니면 code != 200으로 판단할 건지 에러 판별에 대한 논의 필요 */
		if (hasCallback == 1)
		{
			if(oJson.code != 200) {
				params[1](oJson.body, oJson.body);
				oJson.message = ttb.return_RPCerror_message(oJson.code);
				let err = new ProviderRpcError(oJson.message);
				err.code = oJson.code;
				throw err;
			 }else params[1](null, oJson.body);
		}
		else
			return Promise.resolve(oJson.body);
	};
	console.log('Maroo provider injected');
}
