using System;
using Dapper.Contrib.Extensions;

namespace CustomEntity
{
	// Token: 0x02000009 RID: 9
	[Table("ThongBao")]
	public class MessagesDto
	{
		// Token: 0x17000027 RID: 39
		// (get) Token: 0x0600005F RID: 95 RVA: 0x00002CFC File Offset: 0x00000EFC
		// (set) Token: 0x06000060 RID: 96 RVA: 0x00002D04 File Offset: 0x00000F04
		[ExplicitKey]
		public int ID { get; set; }

		// Token: 0x17000028 RID: 40
		// (get) Token: 0x06000061 RID: 97 RVA: 0x00002D0D File Offset: 0x00000F0D
		// (set) Token: 0x06000062 RID: 98 RVA: 0x00002D15 File Offset: 0x00000F15
		public string Content { get; set; }

		// Token: 0x17000029 RID: 41
		// (get) Token: 0x06000063 RID: 99 RVA: 0x00002D1E File Offset: 0x00000F1E
		// (set) Token: 0x06000064 RID: 100 RVA: 0x00002D26 File Offset: 0x00000F26
		public string Link { get; set; }

		// Token: 0x1700002A RID: 42
		// (get) Token: 0x06000065 RID: 101 RVA: 0x00002D2F File Offset: 0x00000F2F
		// (set) Token: 0x06000066 RID: 102 RVA: 0x00002D37 File Offset: 0x00000F37
		public int EdataID { get; set; }

		// Token: 0x1700002B RID: 43
		// (get) Token: 0x06000067 RID: 103 RVA: 0x00002D40 File Offset: 0x00000F40
		// (set) Token: 0x06000068 RID: 104 RVA: 0x00002D48 File Offset: 0x00000F48
		public DateTime CreatedDate { get; set; }

		// Token: 0x1700002C RID: 44
		// (get) Token: 0x06000069 RID: 105 RVA: 0x00002D51 File Offset: 0x00000F51
		// (set) Token: 0x0600006A RID: 106 RVA: 0x00002D59 File Offset: 0x00000F59
		public string name { get; set; }

		// Token: 0x1700002D RID: 45
		// (get) Token: 0x0600006B RID: 107 RVA: 0x00002D62 File Offset: 0x00000F62
		// (set) Token: 0x0600006C RID: 108 RVA: 0x00002D6A File Offset: 0x00000F6A
		public string Portrait { get; set; }

		// Token: 0x1700002E RID: 46
		// (get) Token: 0x0600006D RID: 109 RVA: 0x00002D73 File Offset: 0x00000F73
		// (set) Token: 0x0600006E RID: 110 RVA: 0x00002D7B File Offset: 0x00000F7B
		public string EdataName { get; set; }

		// Token: 0x1700002F RID: 47
		// (get) Token: 0x0600006F RID: 111 RVA: 0x00002D84 File Offset: 0x00000F84
		// (set) Token: 0x06000070 RID: 112 RVA: 0x00002D8C File Offset: 0x00000F8C
		public string EdataCoverPic { get; set; }

		// Token: 0x17000030 RID: 48
		// (get) Token: 0x06000071 RID: 113 RVA: 0x00002D95 File Offset: 0x00000F95
		// (set) Token: 0x06000072 RID: 114 RVA: 0x00002D9D File Offset: 0x00000F9D
		public string Type { get; set; }

		// Token: 0x17000031 RID: 49
		// (get) Token: 0x06000073 RID: 115 RVA: 0x00002DA8 File Offset: 0x00000FA8
		[Write(false)]
		[Computed]
		public string CreatedDateStr
		{
			get
			{
				return this.CreatedDate.ToString("HH:mm dd/MM/yyyy");
			}
		}
	}
}
