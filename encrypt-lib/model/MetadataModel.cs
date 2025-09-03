using System;
using System.Runtime.CompilerServices;
using System.Runtime.Serialization;
using System.Security;
using System.Security.Permissions;
using com.edc.classbook.util.encryption;
using IKVM.Attributes;
using ikvm.@internal;
using IKVM.Runtime;
using java.io;
using java.lang;

namespace com.edc.classbook.model
{
	// Token: 0x02000008 RID: 8
	[Implements(new string[] { "java.io.Serializable" })]
	[Serializable]
	public class MetadataModel : Object, Serializable.__Interface, ISerializable
	{
		// Token: 0x06000083 RID: 131 RVA: 0x00002A6C File Offset: 0x00000C6C
		[LineNumberTable(new byte[] { 159, 160, 104 })]
		[MethodImpl(8)]
		public MetadataModel()
		{
		}

		// Token: 0x06000084 RID: 132 RVA: 0x00002A76 File Offset: 0x00000C76
		public virtual void setKey(string key)
		{
			this.key = key;
		}

		// Token: 0x06000085 RID: 133 RVA: 0x00002A7F File Offset: 0x00000C7F
		public virtual void setName(string name)
		{
			this.name = name;
		}

		// Token: 0x06000086 RID: 134 RVA: 0x00002A88 File Offset: 0x00000C88
		public virtual void setValue(string value)
		{
			this.value = value;
		}

		// Token: 0x06000087 RID: 135 RVA: 0x00002A94 File Offset: 0x00000C94
		[LineNumberTable(new byte[]
		{
			159, 164, 135, 166, 191, 8, 2, 97, 203, 191,
			8, 2, 97, 203, 191, 8, 2, 97, 139
		})]
		[MethodImpl(8)]
		public virtual MetadataModel decrypt()
		{
			ClassBookEncryption classBookEncryption = new ClassBookEncryption(1);
			MetadataModel metadataModel = new MetadataModel();
			try
			{
				metadataModel.setKey(classBookEncryption.decryptString(this.key));
			}
			catch (Exception ex)
			{
				if (ByteCodeHelper.MapException<Exception>(ex, ByteCodeHelper.MapFlags.Unused) == null)
				{
					throw;
				}
				goto IL_0031;
			}
			goto IL_0042;
			IL_0031:
			metadataModel.setKey("");
			try
			{
				IL_0042:
				metadataModel.setName(classBookEncryption.decryptString(this.name));
			}
			catch (Exception ex2)
			{
				if (ByteCodeHelper.MapException<Exception>(ex2, ByteCodeHelper.MapFlags.Unused) == null)
				{
					throw;
				}
				goto IL_0066;
			}
			goto IL_0077;
			IL_0066:
			metadataModel.setName("");
			try
			{
				IL_0077:
				metadataModel.setValue(classBookEncryption.decryptString(this.value));
			}
			catch (Exception ex3)
			{
				if (ByteCodeHelper.MapException<Exception>(ex3, ByteCodeHelper.MapFlags.Unused) == null)
				{
					throw;
				}
				goto IL_009B;
			}
			return metadataModel;
			IL_009B:
			metadataModel.setValue("");
			return metadataModel;
		}

		// Token: 0x06000088 RID: 136 RVA: 0x00002B78 File Offset: 0x00000D78
		public virtual string getKey()
		{
			return this.key;
		}

		// Token: 0x06000089 RID: 137 RVA: 0x00002B80 File Offset: 0x00000D80
		public virtual string getName()
		{
			return this.name;
		}

		// Token: 0x0600008A RID: 138 RVA: 0x00002B88 File Offset: 0x00000D88
		public virtual string getValue()
		{
			return this.value;
		}

		// Token: 0x0600008B RID: 139 RVA: 0x00002B90 File Offset: 0x00000D90
		public virtual void setId(int id)
		{
			this.id = id;
		}

		// Token: 0x0600008C RID: 140 RVA: 0x00002B99 File Offset: 0x00000D99
		public virtual int getId()
		{
			return this.id;
		}

		// Token: 0x0600008D RID: 141 RVA: 0x00002BA4 File Offset: 0x00000DA4
		[HideFromJava]
		public static implicit operator Serializable(MetadataModel A_0)
		{
			Serializable serializable;
			serializable.__<ref> = A_0;
			return serializable;
		}

		// Token: 0x0600008E RID: 142 RVA: 0x00002BC0 File Offset: 0x00000DC0
		[SecurityCritical]
		[HideFromJava]
		[PermissionSet(2, XML = "<PermissionSet class=\"System.Security.PermissionSet\"\r\nversion=\"1\">\r\n<IPermission class=\"System.Security.Permissions.SecurityPermission, mscorlib, Version=2.0.0.0, Culture=neutral, PublicKeyToken=b77a5c561934e089\"\r\nversion=\"1\"\r\nFlags=\"SerializationFormatter\"/>\r\n</PermissionSet>\r\n")]
		protected virtual void GetObjectData(SerializationInfo A_1, StreamingContext A_2)
		{
			Serialization.writeObject(this, A_1);
		}

		// Token: 0x0600008F RID: 143 RVA: 0x00002BC9 File Offset: 0x00000DC9
		[HideFromJava]
		[PermissionSet(2, XML = "<PermissionSet class=\"System.Security.PermissionSet\"\r\nversion=\"1\">\r\n<IPermission class=\"System.Security.Permissions.SecurityPermission, mscorlib, Version=2.0.0.0, Culture=neutral, PublicKeyToken=b77a5c561934e089\"\r\nversion=\"1\"\r\nFlags=\"SerializationFormatter\"/>\r\n</PermissionSet>\r\n")]
		protected MetadataModel(SerializationInfo A_1, StreamingContext A_2)
		{
			Serialization.readObject(this, A_1);
		}

		// Token: 0x04000031 RID: 49
		private int id;

		// Token: 0x04000032 RID: 50
		private string key;

		// Token: 0x04000033 RID: 51
		private string name;

		// Token: 0x04000034 RID: 52
		private string value;
	}
}
