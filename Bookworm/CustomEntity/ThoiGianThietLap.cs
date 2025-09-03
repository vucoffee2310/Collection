using System;
using Dapper.Contrib.Extensions;

namespace CustomEntity
{
	// Token: 0x02000008 RID: 8
	[Table("BookThoiGianDuDinh")]
	public class ThoiGianThietLap
	{
		// Token: 0x17000020 RID: 32
		// (get) Token: 0x06000050 RID: 80 RVA: 0x00002C7D File Offset: 0x00000E7D
		// (set) Token: 0x06000051 RID: 81 RVA: 0x00002C85 File Offset: 0x00000E85
		[ExplicitKey]
		public long BookId { get; set; }

		// Token: 0x17000021 RID: 33
		// (get) Token: 0x06000052 RID: 82 RVA: 0x00002C8E File Offset: 0x00000E8E
		// (set) Token: 0x06000053 RID: 83 RVA: 0x00002C96 File Offset: 0x00000E96
		public long UserId { get; set; }

		// Token: 0x17000022 RID: 34
		// (get) Token: 0x06000054 RID: 84 RVA: 0x00002C9F File Offset: 0x00000E9F
		// (set) Token: 0x06000055 RID: 85 RVA: 0x00002CA7 File Offset: 0x00000EA7
		public string Code { get; set; }

		// Token: 0x17000023 RID: 35
		// (get) Token: 0x06000056 RID: 86 RVA: 0x00002CB0 File Offset: 0x00000EB0
		// (set) Token: 0x06000057 RID: 87 RVA: 0x00002CB8 File Offset: 0x00000EB8
		public DateTime CreatedDate { get; set; }

		// Token: 0x17000024 RID: 36
		// (get) Token: 0x06000058 RID: 88 RVA: 0x00002CC1 File Offset: 0x00000EC1
		// (set) Token: 0x06000059 RID: 89 RVA: 0x00002CC9 File Offset: 0x00000EC9
		public DateTime ModifiedDate { get; set; }

		// Token: 0x17000025 RID: 37
		// (get) Token: 0x0600005A RID: 90 RVA: 0x00002CD2 File Offset: 0x00000ED2
		// (set) Token: 0x0600005B RID: 91 RVA: 0x00002CDA File Offset: 0x00000EDA
		public long TimeFinish { get; set; }

		// Token: 0x17000026 RID: 38
		// (get) Token: 0x0600005C RID: 92 RVA: 0x00002CE3 File Offset: 0x00000EE3
		// (set) Token: 0x0600005D RID: 93 RVA: 0x00002CEB File Offset: 0x00000EEB
		public long LibId { get; set; }
	}
}
