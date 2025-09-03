using System;

namespace Bookworm
{
	// Token: 0x02000014 RID: 20
	public class CommonFunction
	{
		// Token: 0x0600010C RID: 268 RVA: 0x00003C12 File Offset: 0x00001E12
		private CommonFunction()
		{
		}

		// Token: 0x0600010D RID: 269 RVA: 0x00003C1A File Offset: 0x00001E1A
		public static CommonFunction Instance()
		{
			if (CommonFunction.instance == null)
			{
				CommonFunction.instance = new CommonFunction();
			}
			return CommonFunction.instance;
		}

		// Token: 0x04000079 RID: 121
		private static CommonFunction instance;
	}
}
