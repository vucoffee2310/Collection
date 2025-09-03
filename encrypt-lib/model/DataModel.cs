using System;
using System.ComponentModel;
using System.Runtime.CompilerServices;
using System.Runtime.Serialization;
using System.Security;
using System.Security.Permissions;
using IKVM.Attributes;
using ikvm.@internal;
using IKVM.Runtime;
using java.io;
using java.lang;

namespace com.edc.classbook.model
{
	// Token: 0x02000006 RID: 6
	[Implements(new string[] { "java.lang.Comparable", "java.io.Serializable" })]
	[Signature("Ljava/lang/Object;Ljava/lang/Comparable<Lcom/edc/classbook/model/DataModel;>;Ljava/io/Serializable;")]
	[Serializable]
	public class DataModel : Object, Comparable, Serializable.__Interface, ISerializable
	{
		// Token: 0x06000059 RID: 89 RVA: 0x000027B4 File Offset: 0x000009B4
		[LineNumberTable(146)]
		public virtual int compareTo(DataModel another)
		{
			return this.data_index - another.data_index;
		}

		// Token: 0x0600005A RID: 90 RVA: 0x000027C4 File Offset: 0x000009C4
		[LineNumberTable(new byte[] { 159, 178, 104, 103, 103, 104, 104, 103, 104 })]
		[MethodImpl(8)]
		public DataModel(int type, string title, string shortDecription, string decription, string sourceData, string thumbnails)
		{
			this.type = type;
			this.shortDescription = shortDecription;
			this.sourceData = sourceData;
			this.description = decription;
			this.title = title;
			this.thumbnails = thumbnails;
		}

		// Token: 0x0600005B RID: 91 RVA: 0x00002806 File Offset: 0x00000A06
		[LineNumberTable(new byte[] { 159, 191, 136 })]
		[MethodImpl(8)]
		public DataModel()
		{
		}

		// Token: 0x0600005C RID: 92 RVA: 0x00002810 File Offset: 0x00000A10
		[LineNumberTable(new byte[]
		{
			7, 168, 223, 9, 226, 61, 97, 102, 167, 140,
			140, 140, 140, 140
		})]
		[MethodImpl(8)]
		public DataModel(DataModelEnc enc)
		{
			Exception ex3;
			try
			{
				this.type = Integer.parseInt(enc.getType());
			}
			catch (Exception ex)
			{
				Exception ex2 = ByteCodeHelper.MapException<Exception>(ex, ByteCodeHelper.MapFlags.None);
				if (ex2 == null)
				{
					throw;
				}
				ex3 = ex2;
				goto IL_002D;
			}
			goto IL_0040;
			IL_002D:
			Exception ex4 = ex3;
			Throwable.instancehelper_printStackTrace(ex4);
			this.type = 0;
			IL_0040:
			this.shortDescription = enc.getShortDescription();
			this.sourceData = enc.getSourceData();
			this.description = enc.getDescription();
			this.title = enc.getTitle();
			this.thumbnails = enc.getThumbnails();
		}

		// Token: 0x0600005D RID: 93 RVA: 0x000028AC File Offset: 0x00000AAC
		public virtual string getThumbnails()
		{
			return this.thumbnails;
		}

		// Token: 0x0600005E RID: 94 RVA: 0x000028B4 File Offset: 0x00000AB4
		public virtual void setThumbnails(string thumbnails)
		{
			this.thumbnails = thumbnails;
		}

		// Token: 0x0600005F RID: 95 RVA: 0x000028BD File Offset: 0x00000ABD
		public virtual int getType()
		{
			return this.type;
		}

		// Token: 0x06000060 RID: 96 RVA: 0x000028C5 File Offset: 0x00000AC5
		public virtual void setType(int type)
		{
			this.type = type;
		}

		// Token: 0x06000061 RID: 97 RVA: 0x000028CE File Offset: 0x00000ACE
		public virtual string getShortDescription()
		{
			return this.shortDescription;
		}

		// Token: 0x06000062 RID: 98 RVA: 0x000028D6 File Offset: 0x00000AD6
		public virtual void setShortDescription(string shortDecription)
		{
			this.shortDescription = shortDecription;
		}

		// Token: 0x06000063 RID: 99 RVA: 0x000028DF File Offset: 0x00000ADF
		public virtual string getSourceData()
		{
			return this.sourceData;
		}

		// Token: 0x06000064 RID: 100 RVA: 0x000028E7 File Offset: 0x00000AE7
		public virtual void setSourceData(string sourceData)
		{
			this.sourceData = sourceData;
		}

		// Token: 0x06000065 RID: 101 RVA: 0x000028F0 File Offset: 0x00000AF0
		public virtual string getDescription()
		{
			return this.description;
		}

		// Token: 0x06000066 RID: 102 RVA: 0x000028F8 File Offset: 0x00000AF8
		public virtual void setDescription(string decription)
		{
			this.description = decription;
		}

		// Token: 0x06000067 RID: 103 RVA: 0x00002901 File Offset: 0x00000B01
		public virtual string getTitle()
		{
			return this.title;
		}

		// Token: 0x06000068 RID: 104 RVA: 0x00002909 File Offset: 0x00000B09
		public virtual void setTitle(string title)
		{
			this.title = title;
		}

		// Token: 0x06000069 RID: 105 RVA: 0x00002912 File Offset: 0x00000B12
		public virtual int getData_index()
		{
			return this.data_index;
		}

		// Token: 0x0600006A RID: 106 RVA: 0x0000291A File Offset: 0x00000B1A
		public virtual void setData_index(int data_index)
		{
			this.data_index = data_index;
		}

		// Token: 0x0600006B RID: 107 RVA: 0x00002923 File Offset: 0x00000B23
		[Modifiers(Modifiers.Public | Modifiers.Volatile | Modifiers.Synthetic)]
		[EditorBrowsable(1)]
		[LineNumberTable(11)]
		[MethodImpl(8)]
		public virtual int compareTo(object x0)
		{
			return this.compareTo((DataModel)x0);
		}

		// Token: 0x0600006C RID: 108 RVA: 0x00002934 File Offset: 0x00000B34
		[HideFromJava]
		public static implicit operator Serializable(DataModel A_0)
		{
			Serializable serializable;
			serializable.__<ref> = A_0;
			return serializable;
		}

		// Token: 0x0600006D RID: 109 RVA: 0x00002950 File Offset: 0x00000B50
		[HideFromJava]
		int IComparable.Object;)IcompareTo(object A_1)
		{
			return this.compareTo(A_1);
		}

		// Token: 0x0600006E RID: 110 RVA: 0x00002959 File Offset: 0x00000B59
		[SecurityCritical]
		[HideFromJava]
		[PermissionSet(2, XML = "<PermissionSet class=\"System.Security.PermissionSet\"\r\nversion=\"1\">\r\n<IPermission class=\"System.Security.Permissions.SecurityPermission, mscorlib, Version=2.0.0.0, Culture=neutral, PublicKeyToken=b77a5c561934e089\"\r\nversion=\"1\"\r\nFlags=\"SerializationFormatter\"/>\r\n</PermissionSet>\r\n")]
		protected virtual void GetObjectData(SerializationInfo A_1, StreamingContext A_2)
		{
			Serialization.writeObject(this, A_1);
		}

		// Token: 0x0600006F RID: 111 RVA: 0x00002962 File Offset: 0x00000B62
		[HideFromJava]
		[PermissionSet(2, XML = "<PermissionSet class=\"System.Security.PermissionSet\"\r\nversion=\"1\">\r\n<IPermission class=\"System.Security.Permissions.SecurityPermission, mscorlib, Version=2.0.0.0, Culture=neutral, PublicKeyToken=b77a5c561934e089\"\r\nversion=\"1\"\r\nFlags=\"SerializationFormatter\"/>\r\n</PermissionSet>\r\n")]
		protected DataModel(SerializationInfo A_1, StreamingContext A_2)
		{
			Serialization.readObject(this, A_1);
		}

		// Token: 0x04000023 RID: 35
		private int type;

		// Token: 0x04000024 RID: 36
		private string shortDescription;

		// Token: 0x04000025 RID: 37
		private string sourceData;

		// Token: 0x04000026 RID: 38
		private string description;

		// Token: 0x04000027 RID: 39
		private string title;

		// Token: 0x04000028 RID: 40
		private string thumbnails;

		// Token: 0x04000029 RID: 41
		private int data_index;
	}
}
