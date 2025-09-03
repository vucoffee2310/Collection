using System;
using System.Collections.Generic;

namespace CustomEntity
{
	// Token: 0x0200000B RID: 11
	public class MessagesView
	{
		// Token: 0x17000045 RID: 69
		// (get) Token: 0x0600009C RID: 156 RVA: 0x00002F1B File Offset: 0x0000111B
		// (set) Token: 0x0600009D RID: 157 RVA: 0x00002F23 File Offset: 0x00001123
		public string status { get; set; }

		// Token: 0x17000046 RID: 70
		// (get) Token: 0x0600009E RID: 158 RVA: 0x00002F2C File Offset: 0x0000112C
		// (set) Token: 0x0600009F RID: 159 RVA: 0x00002F34 File Offset: 0x00001134
		public string message { get; set; }

		// Token: 0x17000047 RID: 71
		// (get) Token: 0x060000A0 RID: 160 RVA: 0x00002F3D File Offset: 0x0000113D
		// (set) Token: 0x060000A1 RID: 161 RVA: 0x00002F45 File Offset: 0x00001145
		public List<MessagesDto> data { get; set; }
	}
}
