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
		// Token: 0x17000078 RID: 120
		// (get) Token: 0x06000149 RID: 329 RVA: 0x00004B4A File Offset: 0x00002D4A
		// (set) Token: 0x0600014A RID: 330 RVA: 0x00004B5C File Offset: 0x00002D5C
		[UserScopedSetting]
		[DebuggerNonUserCode]
		public Library LoggedLibrary
		{
			get
			{
				return (Library)this["LoggedLibrary"];
			}
			set
			{
				this["LoggedLibrary"] = value;
			}
		}

		// Token: 0x17000079 RID: 121
		// (get) Token: 0x0600014B RID: 331 RVA: 0x00004B6A File Offset: 0x00002D6A
		// (set) Token: 0x0600014C RID: 332 RVA: 0x00004B7C File Offset: 0x00002D7C
		[UserScopedSetting]
		[DebuggerNonUserCode]
		public Book ReadingBook
		{
			get
			{
				return (Book)this["ReadingBook"];
			}
			set
			{
				this["ReadingBook"] = value;
			}
		}

		// Token: 0x1700007A RID: 122
		// (get) Token: 0x0600014D RID: 333 RVA: 0x00004B8A File Offset: 0x00002D8A
		// (set) Token: 0x0600014E RID: 334 RVA: 0x00004B9C File Offset: 0x00002D9C
		[UserScopedSetting]
		[DebuggerNonUserCode]
		public Theme CurrentTheme
		{
			get
			{
				return (Theme)this["CurrentTheme"];
			}
			set
			{
				this["CurrentTheme"] = value;
			}
		}

		// Token: 0x1700007B RID: 123
		// (get) Token: 0x0600014F RID: 335 RVA: 0x00004BAA File Offset: 0x00002DAA
		// (set) Token: 0x06000150 RID: 336 RVA: 0x00004BBC File Offset: 0x00002DBC
		[UserScopedSetting]
		[DebuggerNonUserCode]
		public ChinhSach ChinhSach
		{
			get
			{
				return (ChinhSach)this["ChinhSach"];
			}
			set
			{
				this["ChinhSach"] = value;
			}
		}
	}
}
