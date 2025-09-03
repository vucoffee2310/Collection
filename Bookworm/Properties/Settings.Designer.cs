using System;
using System.CodeDom.Compiler;
using System.Configuration;
using System.Diagnostics;
using System.Runtime.CompilerServices;
using CustomEntity;
using CustomEntity.Model;

namespace Bookworm.Properties
{
	// Token: 0x0200001B RID: 27
	[CompilerGenerated]
	[GeneratedCode("Microsoft.VisualStudio.Editors.SettingsDesigner.SettingsSingleFileGenerator", "15.9.0.0")]
	internal sealed partial class Settings : ApplicationSettingsBase
	{
		// Token: 0x17000077 RID: 119
		// (get) Token: 0x06000148 RID: 328 RVA: 0x00004B43 File Offset: 0x00002D43
		public static Settings Default
		{
			get
			{
				return Settings.defaultInstance;
			}
		}

		// Token: 0x040000AC RID: 172
		private static Settings defaultInstance = (Settings)SettingsBase.Synchronized(new Settings());
	}
}
