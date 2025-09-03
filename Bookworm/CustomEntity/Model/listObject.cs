using System;
using System.Collections.Generic;

namespace CustomEntity.Model
{
	// Token: 0x02000011 RID: 17
	public class listObject
	{
		// Token: 0x17000061 RID: 97
		// (get) Token: 0x060000D9 RID: 217 RVA: 0x00003139 File Offset: 0x00001339
		public static listObject Instance
		{
			get
			{
				if (listObject.instance == null)
				{
					listObject.instance = new listObject();
				}
				return listObject.instance;
			}
		}

		// Token: 0x17000062 RID: 98
		// (get) Token: 0x060000DA RID: 218 RVA: 0x00003151 File Offset: 0x00001351
		// (set) Token: 0x060000DB RID: 219 RVA: 0x00003159 File Offset: 0x00001359
		public List<Category> listCategory { get; set; }

		// Token: 0x04000062 RID: 98
		private static listObject instance;
	}
}
