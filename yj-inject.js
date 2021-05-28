(function () {
let APP_HOST = 'dev-wallet.nefone.net';
let SLASH2 = '/' + '/';

if (should_inject())
{
	inject_script('');
	start();
}

/**
 * Sets up the stream communication and submits site metadatad
 *
 */
async function start()
{
	await wait_for_dapp_is_ready();
}

/**
 * Injects a script tag into the current document
 *
 * @param {string} content - Code to be executed in the current document
 */
function inject_script(content)
{
	let web3_src = `${location.protocol}${SLASH2}${APP_HOST}/js/web3.min.js`;
	let provider_src = `${location.protocol}${SLASH2}${APP_HOST}/browser/ttb-provider.js?${(new Date() * 1)}`;
	console.log('wow ttb-inject');

	
	/* 더이상 web3.js 필요없슴*/
	/*append_js(web3_src, false, () => {append_js(provider_src, true)});*/
	
	append_js(provider_src, true); 

	if(location.host.includes('1inch')) append_style('1inch');
}

function append_js(src, is_module, callback)
{
	if(document.querySelector(`script[src='${src}']`)) return false;

	let scriptTag = document.createElement('script');
	scriptTag.src = src;
	if(is_module) scriptTag.setAttribute('type', 'module');
	scriptTag.crossorigin = "anonymous";

	if (callback) scriptTag.onload = callback;

	const container = document.head || document.documentElement;
	container.insertBefore(scriptTag, container.children[0]);
	console.log('inserted');

	/*
	나중에는 이주석을 살릴것!
	container.removeChild(scriptTag);
	*/

	return true;
}

function append_style(site)
{
  if(document.querySelector('link[name="ttb"]')) return false;

  let style = document.createElement('link');
  style.name = "ttb";
  style.type = "text/css";
  style.rel = "stylesheet";
  style.media = "all";
  style.href = `${location.protocol}${SLASH2}${APP_HOST}/browser/embed/${site}.css?${(new Date() * 1)}`;

  document.documentElement.append(style);
};

/**
 * Determines if the provider should be injected.
 *
 * @returns {boolean} {@code true} if the provider should be injected.
 */
function should_inject()
{
	return doctype_is_html() && is_ignore_suffix() && has_documentElement() && (is_white_domain() || !is_ignore_domain());
}

/**
 * http 응답헤더의 content-type 이 text/html 인 경우에 doctype.name이 'html'로 되는듯함
 *
 * @returns {boolean} {@code true} doctype이 없거나 'html'이 아니면 통과!
 */
function doctype_is_html()
{
	const { doctype } = window.document;

	return (doctype)? (doctype.name === 'html'): true;
}

/**
 * 현재 url에 injection 필요없는 파일 확장이 들어있는지 확인
 *
 * This checks {@code window.location.pathname} against a set of file extensions
 * that should not have the provider injected into them. This check is indifferent
 * of query parameters in the location.
 *
 * @returns {boolean} whether or not the extension of the current document is prohibited
 */
function is_ignore_suffix()
{
	return (null === window.location.pathname.match(/[.](?:xml|pdf|js|css)$/u));
}

/**
 * html 태그가 존재하여 DOM의 루트가 존재하는지 확인
 *
 * @returns {boolean} {@code true} if the documentElement is an html node or if none exists
 */
function has_documentElement()
{
	const documentElement = document.documentElement.nodeName;

	return (documentElement)? (documentElement.toLowerCase() === 'html'): true;
}

/**
 * 무조건 허용으로 등록된 호스트 인지 확인
 * @returns {boolean} {@code true}
 */
function is_white_domain()
{
	const domains = ['nefone.net'];

	return domains.indexOf(window.location.host) > -1;
}

/**
 * 무조건 무시할 호스트인지 확인
 *
 * @returns {boolean} {@code true} if the current domain is blocked
 */
function is_ignore_domain()
{
	const domains = [
		'uscourts.gov',
		'dropbox.com',
		'webbyawards.com',
		'cdn.shopify.com',
		'adyen.com',
		'gravityforms.com',
		'harbourair.com',
		'ani.gamer.com.tw',
		'blueskybooking.com',
		'sharefile.com'
	];

	return domains.indexOf(window.location.host) > -1;
}

/**
 * Returns a promise that resolves when the DOM is loaded (does not wait for images to load)
 */
async function wait_for_dapp_is_ready()
{
	/* already loaded dapp이 로딩됐다면 기다릴거도 없다. */
	if (['interactive', 'complete'].includes(document.readyState)) return;

	/* wait for load dpp 로딩 완료시 까지 기다려준다.*/
	await new Promise((resolve) => window.addEventListener('DOMContentLoaded', resolve, { once: true }));
}
}());
