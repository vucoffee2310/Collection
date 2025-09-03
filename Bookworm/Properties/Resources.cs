using System;
using System.CodeDom.Compiler;
using System.ComponentModel;
using System.Diagnostics;
using System.Globalization;
using System.Resources;
using System.Runtime.CompilerServices;

namespace Bookworm.Properties
{
	// Token: 0x0200001A RID: 26
	[GeneratedCode("System.Resources.Tools.StronglyTypedResourceBuilder", "4.0.0.0")]
	[DebuggerNonUserCode]
	[CompilerGenerated]
	internal class Resources
	{
		// Token: 0x06000144 RID: 324 RVA: 0x00004B00 File Offset: 0x00002D00
		internal Resources()
		{
		}

		// Token: 0x17000075 RID: 117
		// (get) Token: 0x06000145 RID: 325 RVA: 0x00004B08 File Offset: 0x00002D08
		[EditorBrowsable(EditorBrowsableState.Advanced)]
		internal static ResourceManager ResourceManager
		{
			get
			{
				if (Resources.resourceMan == null)
				{
					Resources.resourceMan = new ResourceManager("Bookworm.Properties.Resources", typeof(Resources).Assembly);
				}
				return Resources.resourceMan;
			}
		}

		// Token: 0x17000076 RID: 118
		// (get) Token: 0x06000146 RID: 326 RVA: 0x00004B34 File Offset: 0x00002D34
		// (set) Token: 0x06000147 RID: 327 RVA: 0x00004B3B File Offset: 0x00002D3B
		[EditorBrowsable(EditorBrowsableState.Advanced)]
		internal static CultureInfo Culture
		{
			get
			{
				return Resources.resourceCulture;
			}
			set
			{
				Resources.resourceCulture = value;
			}
		}

		// Token: 0x040000AA RID: 170
		private static ResourceManager resourceMan;

		// Token: 0x040000AB RID: 171
		private static CultureInfo resourceCulture;
	}
}
