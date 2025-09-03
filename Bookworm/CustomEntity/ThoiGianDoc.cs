using System;
using Bookworm;
using Dapper.Contrib.Extensions;

namespace CustomEntity
{
	// Token: 0x02000007 RID: 7
	[Table("ThoiGianDoc")]
	public class ThoiGianDoc
	{
		// Token: 0x17000018 RID: 24
		// (get) Token: 0x0600003F RID: 63 RVA: 0x00002BC7 File Offset: 0x00000DC7
		// (set) Token: 0x06000040 RID: 64 RVA: 0x00002BCF File Offset: 0x00000DCF
		[Key]
		public int Id { get; set; }

		// Token: 0x17000019 RID: 25
		// (get) Token: 0x06000041 RID: 65 RVA: 0x00002BD8 File Offset: 0x00000DD8
		// (set) Token: 0x06000042 RID: 66 RVA: 0x00002BE0 File Offset: 0x00000DE0
		public long UserId { get; set; }

		// Token: 0x1700001A RID: 26
		// (get) Token: 0x06000043 RID: 67 RVA: 0x00002BE9 File Offset: 0x00000DE9
		// (set) Token: 0x06000044 RID: 68 RVA: 0x00002BF1 File Offset: 0x00000DF1
		public long DataId { get; set; }

		// Token: 0x1700001B RID: 27
		// (get) Token: 0x06000045 RID: 69 RVA: 0x00002BFA File Offset: 0x00000DFA
		// (set) Token: 0x06000046 RID: 70 RVA: 0x00002C02 File Offset: 0x00000E02
		public DateTime BatDau { get; set; } = DateTime.Now;

		// Token: 0x1700001C RID: 28
		// (get) Token: 0x06000047 RID: 71 RVA: 0x00002C0B File Offset: 0x00000E0B
		// (set) Token: 0x06000048 RID: 72 RVA: 0x00002C13 File Offset: 0x00000E13
		public DateTime KetThuc { get; set; } = DateTime.Now;

		// Token: 0x1700001D RID: 29
		// (get) Token: 0x06000049 RID: 73 RVA: 0x00002C1C File Offset: 0x00000E1C
		// (set) Token: 0x0600004A RID: 74 RVA: 0x00002C24 File Offset: 0x00000E24
		public double ThoiGian { get; set; }

		// Token: 0x1700001E RID: 30
		// (get) Token: 0x0600004B RID: 75 RVA: 0x00002C2D File Offset: 0x00000E2D
		// (set) Token: 0x0600004C RID: 76 RVA: 0x00002C35 File Offset: 0x00000E35
		public bool DaUpdate { get; set; }

		// Token: 0x1700001F RID: 31
		// (get) Token: 0x0600004D RID: 77 RVA: 0x00002C3E File Offset: 0x00000E3E
		// (set) Token: 0x0600004E RID: 78 RVA: 0x00002C46 File Offset: 0x00000E46
		public long LibId { get; set; } = MainApp.currentLibrary.ID;
	}
}
