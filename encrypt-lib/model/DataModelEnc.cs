using System;
using System.Runtime.CompilerServices;
using System.Runtime.Serialization;
using System.Security;
using System.Security.Permissions;
using IKVM.Attributes;
using ikvm.@internal;
using java.io;
using java.lang;

namespace com.edc.classbook.model
{
	// Token: 0x02000007 RID: 7
	[Implements(new string[] { "java.io.Serializable" })]
	[Serializable]
	public class DataModelEnc : Object, Serializable.__Interface, ISerializable
	{
		// Token: 0x06000070 RID: 112 RVA: 0x00002971 File Offset: 0x00000B71
		public virtual string getType()
		{
			return this.type;
		}

		// Token: 0x06000071 RID: 113 RVA: 0x00002979 File Offset: 0x00000B79
		public virtual string getShortDescription()
		{
			return this.shortDescription;
		}

		// Token: 0x06000072 RID: 114 RVA: 0x00002981 File Offset: 0x00000B81
		public virtual string getSourceData()
		{
			return this.sourceData;
		}

		// Token: 0x06000073 RID: 115 RVA: 0x00002989 File Offset: 0x00000B89
		public virtual string getDescription()
		{
			return this.description;
		}

		// Token: 0x06000074 RID: 116 RVA: 0x00002991 File Offset: 0x00000B91
		public virtual string getTitle()
		{
			return this.title;
		}

		// Token: 0x06000075 RID: 117 RVA: 0x00002999 File Offset: 0x00000B99
		public virtual string getThumbnails()
		{
			return this.thumbnails;
		}

		// Token: 0x06000076 RID: 118 RVA: 0x000029A4 File Offset: 0x00000BA4
		[LineNumberTable(new byte[] { 159, 176, 104, 103, 103, 104, 104, 103, 104 })]
		[MethodImpl(8)]
		public DataModelEnc(string type, string title, string shortDecription, string decription, string sourceData, string thumbnails)
		{
			this.type = type;
			this.shortDescription = shortDecription;
			this.sourceData = sourceData;
			this.description = decription;
			this.title = title;
			this.thumbnails = thumbnails;
		}

		// Token: 0x06000077 RID: 119 RVA: 0x000029E6 File Offset: 0x00000BE6
		[LineNumberTable(new byte[] { 159, 188, 136 })]
		[MethodImpl(8)]
		public DataModelEnc()
		{
		}

		// Token: 0x06000078 RID: 120 RVA: 0x000029F0 File Offset: 0x00000BF0
		public virtual void setThumbnails(string thumbnails)
		{
			this.thumbnails = thumbnails;
		}

		// Token: 0x06000079 RID: 121 RVA: 0x000029F9 File Offset: 0x00000BF9
		public virtual void setType(string type)
		{
			this.type = type;
		}

		// Token: 0x0600007A RID: 122 RVA: 0x00002A02 File Offset: 0x00000C02
		public virtual void setShortDescription(string shortDecription)
		{
			this.shortDescription = shortDecription;
		}

		// Token: 0x0600007B RID: 123 RVA: 0x00002A0B File Offset: 0x00000C0B
		public virtual void setSourceData(string sourceData)
		{
			this.sourceData = sourceData;
		}

		// Token: 0x0600007C RID: 124 RVA: 0x00002A14 File Offset: 0x00000C14
		public virtual void setDescription(string decription)
		{
			this.description = decription;
		}

		// Token: 0x0600007D RID: 125 RVA: 0x00002A1D File Offset: 0x00000C1D
		public virtual void setTitle(string title)
		{
			this.title = title;
		}

		// Token: 0x0600007E RID: 126 RVA: 0x00002A26 File Offset: 0x00000C26
		public virtual string getData_index()
		{
			return this.data_index;
		}

		// Token: 0x0600007F RID: 127 RVA: 0x00002A2E File Offset: 0x00000C2E
		public virtual void setData_index(string data_index)
		{
			this.data_index = data_index;
		}

		// Token: 0x06000080 RID: 128 RVA: 0x00002A38 File Offset: 0x00000C38
		[HideFromJava]
		public static implicit operator Serializable(DataModelEnc A_0)
		{
			Serializable serializable;
			serializable.__<ref> = A_0;
			return serializable;
		}

		// Token: 0x06000081 RID: 129 RVA: 0x00002A54 File Offset: 0x00000C54
		[SecurityCritical]
		[HideFromJava]
		[PermissionSet(2, XML = "<PermissionSet class=\"System.Security.PermissionSet\"\r\nversion=\"1\">\r\n<IPermission class=\"System.Security.Permissions.SecurityPermission, mscorlib, Version=2.0.0.0, Culture=neutral, PublicKeyToken=b77a5c561934e089\"\r\nversion=\"1\"\r\nFlags=\"SerializationFormatter\"/>\r\n</PermissionSet>\r\n")]
		protected virtual void GetObjectData(SerializationInfo A_1, StreamingContext A_2)
		{
			Serialization.writeObject(this, A_1);
		}

		// Token: 0x06000082 RID: 130 RVA: 0x00002A5D File Offset: 0x00000C5D
		[HideFromJava]
		[PermissionSet(2, XML = "<PermissionSet class=\"System.Security.PermissionSet\"\r\nversion=\"1\">\r\n<IPermission class=\"System.Security.Permissions.SecurityPermission, mscorlib, Version=2.0.0.0, Culture=neutral, PublicKeyToken=b77a5c561934e089\"\r\nversion=\"1\"\r\nFlags=\"SerializationFormatter\"/>\r\n</PermissionSet>\r\n")]
		protected DataModelEnc(SerializationInfo A_1, StreamingContext A_2)
		{
			Serialization.readObject(this, A_1);
		}

		// Token: 0x0400002A RID: 42
		private string type;

		// Token: 0x0400002B RID: 43
		private string shortDescription;

		// Token: 0x0400002C RID: 44
		private string sourceData;

		// Token: 0x0400002D RID: 45
		private string description;

		// Token: 0x0400002E RID: 46
		private string title;

		// Token: 0x0400002F RID: 47
		private string thumbnails;

		// Token: 0x04000030 RID: 48
		private string data_index;
	}
}
