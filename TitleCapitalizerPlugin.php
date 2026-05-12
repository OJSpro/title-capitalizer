<?php

/**
 * @file TitleCapitalizerPlugin.php
 *
 * Title Capitalizer Plugin for OJS/OMP 3.4
 * Adds an 'aA' button to capitalize submission titles.
 */

namespace APP\plugins\generic\titlecapitalizer;

use APP\core\Application;
use APP\template\TemplateManager;
use PKP\core\JSONMessage;
use PKP\linkAction\LinkAction;
use PKP\linkAction\request\AjaxModal;
use PKP\plugins\GenericPlugin;
use PKP\plugins\Hook;

class TitleCapitalizerPlugin extends GenericPlugin
{
    /**
     * @copydoc Plugin::register()
     */
    public function register($category, $path, $mainContextId = null): bool
    {
        if (!parent::register($category, $path, $mainContextId)) {
            return false;
        }
        if ($this->getEnabled($mainContextId)) {
            Hook::add('TemplateManager::display', [$this, 'injectJS']);
        }
        return true;
    }

    /**
     * @copydoc Plugin::getDisplayName()
     */
    public function getDisplayName(): string
    {
        return __('plugins.generic.titlecapitalizer.displayName');
    }

    /**
     * @copydoc Plugin::getDescription()
     */
    public function getDescription(): string
    {
        return __('plugins.generic.titlecapitalizer.description');
    }

    /**
     * Inject JS into the backend — fires once per page request via a static guard.
     */
    public function injectJS(string $hookName, array $args): bool
    {
        static $injected = false;
        if ($injected) {
            return Hook::CONTINUE;
        }
        $injected = true;

        $templateMgr = $args[0];
        $request     = Application::get()->getRequest();
        $context     = $request->getContext();
        $contextId   = $context ? $context->getId() : Application::CONTEXT_SITE;
        $style       = $this->getSetting($contextId, 'style') ?: 'chicago';
        $pluginUrl   = $request->getBaseUrl() . '/' . $this->getPluginPath();

        $templateMgr->addJavaScript(
            'titleCapitalizer',
            $pluginUrl . '/js/titleCapitalizer.js',
            [
                'contexts' => 'backend',
                'priority' => STYLE_SEQUENCE_LAST,
            ]
        );

        $templateMgr->addHeader(
            'titleCapitalizerStyle',
            '<script>window.titleCapitalizerStyle=' . json_encode($style) . ';</script>'
        );

        return Hook::CONTINUE;
    }

    /**
     * @copydoc Plugin::getActions()
     */
    public function getActions($request, $verb): array
    {
        $actions = parent::getActions($request, $verb);
        if (!$this->getEnabled()) {
            return $actions;
        }

        $router = $request->getRouter();
        $url = $router->url(
            $request,
            null,
            null,
            'manage',
            null,
            [
                'verb'     => 'settings',
                'plugin'   => $this->getName(),
                'category' => 'generic',
            ]
        );

        array_unshift(
            $actions,
            new LinkAction(
                'settings',
                new AjaxModal($url, $this->getDisplayName()),
                __('manager.plugins.settings')
            )
        );

        return $actions;
    }

    /**
     * @copydoc Plugin::manage()
     */
    public function manage($args, $request): JSONMessage
    {
        if ($request->getUserVar('verb') !== 'settings') {
            return parent::manage($args, $request);
        }

        $context = $request->getContext();
        $contextId = $context ? $context->getId() : Application::CONTEXT_SITE;

        if ($request->getUserVar('save')) {
            $this->updateSetting($contextId, 'style', $request->getUserVar('style'));
            return new JSONMessage(true);
        }

        $styles = [
            'chicago'   => 'Title Case (Chicago)',
            'apa'       => 'APA Style',
            'mla'       => 'MLA Style',
            'sentence'  => 'Sentence case',
            'uppercase' => 'ALL CAPS',
            'lowercase' => 'lowercase',
        ];

        $templateMgr = TemplateManager::getManager($request);
        $templateMgr->assign([
            'style'      => $this->getSetting($contextId, 'style') ?: 'chicago',
            'styles'     => $styles,
            'pluginName' => $this->getName(),
            'saveFormID' => 'titleCapitalizerSettings',
        ]);

        return new JSONMessage(true, $templateMgr->fetch($this->getTemplateResource('settings.tpl')));
    }
}
