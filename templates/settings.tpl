<script type="text/javascript">
	$(function() {
		$('#titleCapitalizerSettingsForm').pkpHandler('$.pkp.controllers.form.AjaxFormHandler');
	});
</script>

<form class="pkp_form" id="titleCapitalizerSettingsForm" method="post" action="{url router=$smarty.const.ROUTE_COMPONENT component="grid.settings.plugins.SettingsPluginGridHandler" op="manage" verb="settings" plugin=$pluginName category="generic"}">
	{csrf}
	<input type="hidden" name="save" value="1" />
	
	{fbvFormArea id="styleSetting"}
		{fbvFormSection title="plugins.generic.titlecapitalizer.settings.style" description="plugins.generic.titlecapitalizer.settings.styleDescription"}
			{fbvElement type="select" id="style" name="style" from=$styles selected=$style translate=false}
		{/fbvFormSection}
	{/fbvFormArea}

	{fbvFormButtons id="titleCapitalizerSettingsButtons" submitText="common.save" hideCancel=true}
</form>
