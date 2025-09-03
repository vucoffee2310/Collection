using System;
using System.Runtime.CompilerServices;
using com.edc.classbook.model;
using IKVM.Attributes;
using IKVM.Runtime;
using java.io;
using java.lang;
using java.util;

namespace com.edc.classbook.util.serializabledb
{
	// Token: 0x02000068 RID: 104
	public class MetadataDeSerial : Object
	{
		// Token: 0x06000394 RID: 916 RVA: 0x000136CC File Offset: 0x000118CC
		[Throws(new string[] { "java.io.FileNotFoundException" })]
		[LineNumberTable(new byte[] { 159, 169, 232, 53, 103, 231, 75, 103 })]
		[MethodImpl(8)]
		public MetadataDeSerial(InputStream input)
		{
			this.inputStream = null;
			this.objInputStream = null;
			this.inputStream = input;
		}

		// Token: 0x06000395 RID: 917 RVA: 0x000136F8 File Offset: 0x000118F8
		[LineNumberTable(new byte[]
		{
			159, 179, 130, 136, 150, 182, 114, 124, 129, 191,
			1, 2, 97, 134, 102
		})]
		[MethodImpl(8)]
		public virtual MetadataModel getMetadata(string key)
		{
			MetadataModel metadataModel2;
			Exception ex3;
			try
			{
				if (this.dataMetadata == null)
				{
					ObjectInputStream.__<clinit>();
					this.objInputStream = new ObjectInputStream(this.inputStream);
					this.dataMetadata = (Hashtable)this.objInputStream.readObject();
				}
				MetadataModel metadataModel = (MetadataModel)this.dataMetadata.get(key);
				metadataModel2 = metadataModel;
			}
			catch (Exception ex)
			{
				Exception ex2 = ByteCodeHelper.MapException<Exception>(ex, ByteCodeHelper.MapFlags.None);
				if (ex2 == null)
				{
					throw;
				}
				ex3 = ex2;
				goto IL_0060;
			}
			return metadataModel2;
			IL_0060:
			Exception ex4 = ex3;
			try
			{
				this.objInputStream.close();
			}
			catch (Exception ex5)
			{
				if (ByteCodeHelper.MapException<Exception>(ex5, ByteCodeHelper.MapFlags.Unused) == null)
				{
					throw;
				}
				goto IL_0082;
			}
			goto IL_008E;
			IL_0082:
			Throwable.instancehelper_printStackTrace(ex4);
			IL_008E:
			Throwable.instancehelper_printStackTrace(ex4);
			return new MetadataModel();
		}

		// Token: 0x06000396 RID: 918 RVA: 0x000137BC File Offset: 0x000119BC
		[Signature("()Ljava/util/Hashtable<Ljava/lang/String;Lcom/edc/classbook/model/MetadataModel;>;")]
		[LineNumberTable(new byte[]
		{
			17, 136, 150, 214, 127, 2, 129, 191, 1, 2,
			97, 134, 102
		})]
		[MethodImpl(8)]
		public virtual Hashtable getAllMetadata()
		{
			Hashtable hashtable;
			Exception ex3;
			try
			{
				if (this.dataMetadata == null)
				{
					ObjectInputStream.__<clinit>();
					this.objInputStream = new ObjectInputStream(this.inputStream);
					this.dataMetadata = (Hashtable)this.objInputStream.readObject();
				}
				hashtable = this.dataMetadata;
			}
			catch (Exception ex)
			{
				Exception ex2 = ByteCodeHelper.MapException<Exception>(ex, ByteCodeHelper.MapFlags.None);
				if (ex2 == null)
				{
					throw;
				}
				ex3 = ex2;
				goto IL_0051;
			}
			return hashtable;
			IL_0051:
			Exception ex4 = ex3;
			try
			{
				this.objInputStream.close();
			}
			catch (Exception ex5)
			{
				if (ByteCodeHelper.MapException<Exception>(ex5, ByteCodeHelper.MapFlags.Unused) == null)
				{
					throw;
				}
				goto IL_0073;
			}
			goto IL_007F;
			IL_0073:
			Throwable.instancehelper_printStackTrace(ex4);
			IL_007F:
			Throwable.instancehelper_printStackTrace(ex4);
			return new Hashtable();
		}

		// Token: 0x06000397 RID: 919 RVA: 0x00013870 File Offset: 0x00011A70
		[Throws(new string[] { "java.io.FileNotFoundException" })]
		[LineNumberTable(new byte[] { 159, 163, 232, 59, 103, 231, 69, 103, 118 })]
		[MethodImpl(8)]
		public MetadataDeSerial(string serialFile)
		{
			this.inputStream = null;
			this.objInputStream = null;
			this.serialFile = serialFile;
			FileInputStream.__<clinit>();
			this.inputStream = new FileInputStream(this.serialFile);
		}

		// Token: 0x06000398 RID: 920 RVA: 0x000138B0 File Offset: 0x00011AB0
		[LineNumberTable(new byte[] { 39, 112, 108, 112, 103, 191, 23, 2, 98, 167 })]
		[MethodImpl(8)]
		public static void main(string[] args)
		{
			Exception ex3;
			try
			{
				MetadataDeSerial metadataDeSerial = new MetadataDeSerial(new FileInputStream("E:/metadata.clsb"));
				MetadataModel metadata = metadataDeSerial.getMetadata("tac_gia");
				java.lang.System.@out.println(metadata.getValue());
				Hashtable allMetadata = metadataDeSerial.getAllMetadata();
				java.lang.System.@out.println(((MetadataModel)allMetadata.get("dong_tac_gia")).getValue());
			}
			catch (Exception ex)
			{
				Exception ex2 = ByteCodeHelper.MapException<Exception>(ex, ByteCodeHelper.MapFlags.None);
				if (ex2 == null)
				{
					throw;
				}
				ex3 = ex2;
				goto IL_0066;
			}
			return;
			IL_0066:
			Exception ex4 = ex3;
			Throwable.instancehelper_printStackTrace(ex4);
		}

		// Token: 0x06000399 RID: 921 RVA: 0x00013944 File Offset: 0x00011B44
		public virtual void setInputStream(InputStream inputStream)
		{
			this.inputStream = inputStream;
		}

		// Token: 0x0600039A RID: 922 RVA: 0x0001394D File Offset: 0x00011B4D
		public virtual InputStream getInputStream()
		{
			return this.inputStream;
		}

		// Token: 0x04000160 RID: 352
		private string serialFile;

		// Token: 0x04000161 RID: 353
		private InputStream inputStream;

		// Token: 0x04000162 RID: 354
		private ObjectInputStream objInputStream;

		// Token: 0x04000163 RID: 355
		[Signature("Ljava/util/Hashtable<Ljava/lang/String;Lcom/edc/classbook/model/MetadataModel;>;")]
		private Hashtable dataMetadata;
	}
}
