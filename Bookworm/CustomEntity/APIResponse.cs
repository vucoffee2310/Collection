using System;
using System.Collections.Generic;

namespace CustomEntity
{
	// Token: 0x0200000C RID: 12
	public class APIResponse
	{
		// Token: 0x17000048 RID: 72
		// (get) Token: 0x060000A3 RID: 163 RVA: 0x00002F56 File Offset: 0x00001156
		// (set) Token: 0x060000A4 RID: 164 RVA: 0x00002F5E File Offset: 0x0000115E
		public string status { get; set; }

		// Token: 0x17000049 RID: 73
		// (get) Token: 0x060000A5 RID: 165 RVA: 0x00002F67 File Offset: 0x00001167
		// (set) Token: 0x060000A6 RID: 166 RVA: 0x00002F6F File Offset: 0x0000116F
		public string message { get; set; }

		// Token: 0x1700004A RID: 74
		// (get) Token: 0x060000A7 RID: 167 RVA: 0x00002F78 File Offset: 0x00001178
		// (set) Token: 0x060000A8 RID: 168 RVA: 0x00002F80 File Offset: 0x00001180
		public List<Number> data { get; set; }
	}
}
