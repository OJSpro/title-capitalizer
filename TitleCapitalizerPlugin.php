<?php
/**
 * VERSION 1.1 - FIXED NAMING AND LOCALE
 */

namespace APP\plugins\generic\titlecapitalizer;

use PKP\plugins\GenericPlugin;
use PKP\plugins\Hook;
use APP\template\TemplateManager;
use APP\core\Application;
use PKP\linkAction\LinkAction;
use PKP\linkAction\request\AjaxModal;

class TitleCapitalizerPlugin extends GenericPlugin
{
    /**
     * @copydoc Plugin::register()
     */
    public function register($category, $path, $mainContextId = null)
    {
        if (parent::register($category, $path, $mainContextId)) {
            if ($this->getEnabled()) {
                Hook::add('TemplateManager::display', [$this, 'injectJS']);
            }
            return true;
        }
        return false;
    }

    /**
     * Inject JS and settings into the backend
     */
    public function injectJS($hookName, $args)
    {
        $templateMgr = $args[0];
        $request = Application::get()->getRequest();
        $context = $request->getContext();
        $contextId = $context ? $context->getId() : Application::CONTEXT_SITE;

        $style = $this->getSetting($contextId, 'style') ?: 'chicago';

        $templateMgr->addJavaScript(
            'titleCapitalizer',
            $request->getBaseUrl() . '/' . $this->getPluginPath() . '/js/titleCapitalizer.js',
            [
                'contexts' => 'backend',
                'priority' => STYLE_SEQUENCE_LAST
            ]
        );

        // Add settings to JS environment
        $templateMgr->addHeader(
            'titleCapitalizerData',
            '<script type="text/javascript">window.titleCapitalizerStyle = ' . json_encode($style) . ';</script>'
        );

        return false;
    }

    /**
     * @copydoc Plugin::getDisplayName()
     */
    public function getDisplayName()
    {
        return __('plugins.generic.titlecapitalizerplugin.displayName');
    }

    /**
     * @copydoc Plugin::getDescription()
     */
    public function getDescription()
    {
        return __('plugins.generic.titlecapitalizerplugin.description');
    }

    /**
     * @copydoc Plugin::getActions()
     */
    public function getActions($request, $verb)
    {
        $router = $request->getRouter();
        return array_merge(
            $this->getEnabled() ? [
                new LinkAction(
                    'settings',
                    new AjaxModal(
                        $router->url($request, null, null, 'manage', null, ['verb' => 'settings', 'pluginName' => 'titlecapitalizer', 'category' => 'generic']),
                        $this->getDisplayName()
                    ),
                    __('common.settings'),
                    'wrench'
                ),
            ] : [],
            parent::getActions($request, $verb)
        );
    }

    /**
     * @copydoc Plugin::manage()
     */
    public function manage($args, $request)
    {
        switch ($request->getUserVar('verb')) {
            case 'settings':
                $context = $request->getContext();
                $contextId = $context ? $context->getId() : Application::CONTEXT_SITE;

                if ($request->getUserVar('save')) {
                    $this->updateSetting($contextId, 'style', $request->getUserVar('style'));
                    return new \PKP\core\JSONMessage(true);
                }

                $styles = [
                    'chicago' => 'Title Case (Chicago)',
                    'apa' => 'APA Style',
                    'mla' => 'MLA Style',
                    'sentence' => 'Sentence case',
                    'uppercase' => 'ALL CAPS',
                    'lowercase' => 'lowercase',
                ];

                $style = $this->getSetting($contextId, 'style') ?: 'chicago';
                $templateMgr = TemplateManager::getManager($request);
                $templateMgr->assign([
                    'style' => $style,
                    'styles' => $styles,
                    'pluginName' => $this->getName(),
                ]);

                return new \PKP\core\JSONMessage(true, $templateMgr->fetch($this->getTemplateResource('settings.tpl')));
        }
        return parent::manage($args, $request);
    }
}
