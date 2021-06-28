<?php
\Basecode\Core\TGlobal::$outputType = \Basecode\Core\TGlobal::OUTPUTTYPE_JS;

$request = new \Basecode\Core\TRequest();
$request->AttachAttribute($_REQUEST);

$controller = new \Basecode\Core\TController($request);

$hash = $_SERVER['REQUEST_URI'];
$content = '';

$view = $controller->Get_View();
$view->OutputHeader(false);

// clear_cache 변수가 넘어오면 캐시를 갱신 해야됨

$request->propDef('clear_cache', false);

$clear_cache = (false === $request->clear_cache)? false: true;

if(!$clear_cache && \TConf::LIVE_SYSTEM and \Basecode\Tool\TCache::Get($hash, $content))
{
	echo $content;
	exit;
}

$result = new \Basecode\Core\TResult();
$result->HTTP_HOST = $_SERVER['HTTP_HOST'];

$view->AttachValueObject($result);

$content = $view->GetContent();

if(\TConf::LIVE_SYSTEM)	\Basecode\Tool\TCache::Set($hash, $content, 3600);

echo $content;
